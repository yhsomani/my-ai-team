import { supabase } from '../lib/supabaseClient';

export interface AIAnalysisResult {
    analysisId: string;
    userId: string;
    targetType: string;
    targetId: string;
    score: number;
    resultJson: string;
    createdAt?: string;
}

export type AIReviewStatus = 'draft' | 'saved' | 'dismissed';

export interface AIChatMessageRecord {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt?: string;
    sourceLabel?: string;
    sourceDetail?: string;
    controlNote?: string;
    reviewStatus?: AIReviewStatus;
    reviewedAt?: string;
}

export interface AISessionRecord {
    id: string;
    userId: string;
    title: string;
    messages: AIChatMessageRecord[];
    lastSavedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface AutomationSuggestionRecord {
    id: string;
    userId: string;
    sessionId?: string;
    suggestionType: string;
    sourceLabel?: string;
    sourceDetail?: string;
    prompt?: string;
    content: string;
    reviewStatus: AIReviewStatus;
    reviewedAt?: string;
    createdAt: string;
    updatedAt: string;
}

const normalizeMessages = (messages: unknown): AIChatMessageRecord[] => (
    Array.isArray(messages)
        ? messages.filter((message): message is AIChatMessageRecord => (
            Boolean(message) &&
            typeof (message as AIChatMessageRecord).id === 'string' &&
            ((message as AIChatMessageRecord).role === 'user' || (message as AIChatMessageRecord).role === 'assistant') &&
            typeof (message as AIChatMessageRecord).content === 'string'
        ))
        : []
);

const mapSessionResponse = (session: Record<string, any>): AISessionRecord => ({
    id: session.id,
    userId: session.user_id || session.userId || '',
    title: session.title || 'AI Assistant',
    messages: normalizeMessages(session.messages),
    lastSavedAt: session.last_saved_at || session.lastSavedAt || session.updated_at || new Date().toISOString(),
    createdAt: session.created_at || session.createdAt || new Date().toISOString(),
    updatedAt: session.updated_at || session.updatedAt || new Date().toISOString(),
});

const mapSuggestionResponse = (suggestion: Record<string, any>): AutomationSuggestionRecord => ({
    id: suggestion.id,
    userId: suggestion.user_id || suggestion.userId || '',
    sessionId: suggestion.session_id || suggestion.sessionId || undefined,
    suggestionType: suggestion.suggestion_type || suggestion.suggestionType || 'chat_response',
    sourceLabel: suggestion.source_label || suggestion.sourceLabel || undefined,
    sourceDetail: suggestion.source_detail || suggestion.sourceDetail || undefined,
    prompt: suggestion.prompt || undefined,
    content: suggestion.content || '',
    reviewStatus: suggestion.review_status === 'saved' || suggestion.review_status === 'dismissed'
        ? suggestion.review_status
        : 'draft',
    reviewedAt: suggestion.reviewed_at || suggestion.reviewedAt || undefined,
    createdAt: suggestion.created_at || suggestion.createdAt || new Date().toISOString(),
    updatedAt: suggestion.updated_at || suggestion.updatedAt || new Date().toISOString(),
});

export const extractSkillsFromText = (text: string): string[] => {
    const commonSkills = ['javascript', 'typescript', 'react', 'node', 'python', 'java', 'sql', 'aws', 'docker', 'kubernetes', 'html', 'css', 'agile'];
    const textLower = text.toLowerCase();
    return commonSkills.filter(skill => textLower.includes(skill));
};

export const estimateExperienceYears = (text: string): number => {
    const yearsMatch = text.match(/(\d+)\+?\s+years?/i);
    if (yearsMatch && yearsMatch[1]) {
        return parseInt(yearsMatch[1], 10);
    }
    return 0;
};

export const aiService = {
    getLatestSession: async (userId: string): Promise<AISessionRecord | null> => {
        const { data, error } = await supabase
            .from('ai_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.warn('[AI] session sync unavailable; using local chat history.', error);
            throw new Error(`Failed to load AI session: ${error.message}`);
        }

        return data ? mapSessionResponse(data) : null;
    },

    saveSession: async (
        userId: string,
        session: { id: string; title?: string; messages: AIChatMessageRecord[]; lastSavedAt?: string }
    ): Promise<AISessionRecord> => {
        const lastSavedAt = session.lastSavedAt || new Date().toISOString();
        const { data, error } = await supabase
            .from('ai_sessions')
            .upsert({
                id: session.id,
                user_id: userId,
                title: session.title || 'AI Assistant',
                messages: session.messages,
                last_saved_at: lastSavedAt,
            }, {
                onConflict: 'id'
            })
            .select()
            .single();

        if (error) {
            console.warn('[AI] session not synced; using local chat history.', error);
            throw new Error(`Failed to save AI session: ${error.message}`);
        }

        return mapSessionResponse(data);
    },

    deleteSession: async (userId: string, sessionId: string): Promise<void> => {
        const { error } = await supabase
            .from('ai_sessions')
            .delete()
            .eq('user_id', userId)
            .eq('id', sessionId);

        if (error) {
            console.warn('[AI] session delete not synced; using local chat history.', error);
            throw new Error(`Failed to delete AI session: ${error.message}`);
        }
    },

    saveAutomationSuggestion: async (
        userId: string,
        suggestion: {
            id: string;
            sessionId: string;
            prompt?: string;
            content: string;
            sourceLabel?: string;
            sourceDetail?: string;
            reviewStatus?: AIReviewStatus;
            reviewedAt?: string;
        }
    ): Promise<AutomationSuggestionRecord> => {
        const { data, error } = await supabase
            .from('automation_suggestions')
            .upsert({
                id: suggestion.id,
                user_id: userId,
                session_id: suggestion.sessionId,
                suggestion_type: 'chat_response',
                source_label: suggestion.sourceLabel || null,
                source_detail: suggestion.sourceDetail || null,
                prompt: suggestion.prompt || null,
                content: suggestion.content,
                review_status: suggestion.reviewStatus || 'draft',
                reviewed_at: suggestion.reviewedAt || null,
            }, {
                onConflict: 'id'
            })
            .select()
            .single();

        if (error) {
            console.warn('[AI] suggestion review record not synced; using local review state.', error);
            throw new Error(`Failed to save AI suggestion: ${error.message}`);
        }

        return mapSuggestionResponse(data);
    },

    updateAutomationSuggestionStatus: async (
        userId: string,
        suggestionId: string,
        reviewStatus: Exclude<AIReviewStatus, 'draft'>,
        reviewedAt: string
    ): Promise<AutomationSuggestionRecord> => {
        const { data, error } = await supabase
            .from('automation_suggestions')
            .update({
                review_status: reviewStatus,
                reviewed_at: reviewedAt,
            })
            .eq('user_id', userId)
            .eq('id', suggestionId)
            .select()
            .single();

        if (error) {
            console.warn('[AI] suggestion review status not synced; using local review state.', error);
            throw new Error(`Failed to update AI suggestion: ${error.message}`);
        }

        return mapSuggestionResponse(data);
    },

    analyzeResume: async (text: string) => {
        // Store resume analysis in a table for tracking
        const { data, error } = await supabase
            .rpc('analyze_resume', { resume_text: text });
        
        if (error) {
            // Fallback: basic client-side analysis
            return {
                skills: extractSkillsFromText(text),
                experience_years: estimateExperienceYears(text),
                isFallback: true
            };
        }

        return {
            ...data,
            isFallback: false
        };
    },

    getMatchScore: async (resumeText: string, jobDescription: string) => {
        const { data, error } = await supabase.functions.invoke('get-match-score', {
            body: { resumeText, jobDescription }
        });
        
        if (error) throw error;
        return data;
    },

    generateCareerPath: async (userId: string) => {
        const { data, error } = await supabase.functions.invoke('generate-career-path', {
            body: { userId }
        });
        
        if (error) throw error;
        return data;
    },

    getChatResponse: async (message: string) => {
        const { data, error } = await supabase.functions.invoke('chat-assistant', {
            body: { message }
        });
        
        if (error) throw error;
        return data;
    },

    getInsights: async () => {
        // Get platform insights from database instead of guessing
        const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        const { count: jobCount } = await supabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PUBLISHED');
        
        const { count: courseCount } = await supabase
            .from('courses')
            .select('*', { count: 'exact', head: true })
            .eq('is_published', true);
        
        return { 
            insight: `Join ${userCount || 0}+ professionals exploring ${jobCount || 0}+ job opportunities and ${courseCount || 0}+ courses on TalentSphere!`
        };
    }
};
