import { apiClient } from '../api/axios';
import { typedSupabase, type Database, type Json } from '../lib/supabaseClient';

type AISessionRow = Database['public']['Tables']['ai_sessions']['Row'];
type AISessionInsert = Database['public']['Tables']['ai_sessions']['Insert'];
type AutomationSuggestionRow = Database['public']['Tables']['automation_suggestions']['Row'];
type AutomationSuggestionInsert = Database['public']['Tables']['automation_suggestions']['Insert'];
type AutomationSuggestionUpdate = Database['public']['Tables']['automation_suggestions']['Update'];

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

type AIObjectResponse = Record<string, unknown>;
type AIChatResponse = { message?: string } & AIObjectResponse;

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

const mapSessionResponse = (session: AISessionRow): AISessionRecord => ({
    id: session.id,
    userId: session.user_id || '',
    title: session.title || 'AI Assistant',
    messages: normalizeMessages(session.messages),
    lastSavedAt: session.last_saved_at || session.updated_at || new Date().toISOString(),
    createdAt: session.created_at || new Date().toISOString(),
    updatedAt: session.updated_at || new Date().toISOString(),
});

const mapSuggestionResponse = (suggestion: AutomationSuggestionRow): AutomationSuggestionRecord => ({
    id: suggestion.id,
    userId: suggestion.user_id || '',
    sessionId: suggestion.session_id || undefined,
    suggestionType: suggestion.suggestion_type || 'chat_response',
    sourceLabel: suggestion.source_label || undefined,
    sourceDetail: suggestion.source_detail || undefined,
    prompt: suggestion.prompt || undefined,
    content: suggestion.content || '',
    reviewStatus: suggestion.review_status === 'saved' || suggestion.review_status === 'dismissed'
        ? suggestion.review_status
        : 'draft',
    reviewedAt: suggestion.reviewed_at || undefined,
    createdAt: suggestion.created_at || new Date().toISOString(),
    updatedAt: suggestion.updated_at || new Date().toISOString(),
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

const unwrapApiResponseData = (payload: unknown): unknown => (
    payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload
        ? (payload as { data?: unknown }).data
        : payload
);

const parseJsonObjectPayload = (payload: unknown): Record<string, unknown> => {
    if (typeof payload === 'string') {
        try {
            const parsed = JSON.parse(payload);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>;
            }
        } catch {
            return { summary: payload };
        }

        return { summary: payload };
    }

    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        return payload as Record<string, unknown>;
    }

    return {};
};

export const aiService = {
    getLatestSession: async (userId: string): Promise<AISessionRecord | null> => {
        const { data, error } = await typedSupabase
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
        const payload: AISessionInsert = {
            id: session.id,
            user_id: userId,
            title: session.title || 'AI Assistant',
            messages: session.messages as unknown as Json,
            last_saved_at: lastSavedAt,
        };

        const { data, error } = await typedSupabase
            .from('ai_sessions')
            .upsert(payload, {
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
        const { error } = await typedSupabase
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
        const payload: AutomationSuggestionInsert = {
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
        };

        const { data, error } = await typedSupabase
            .from('automation_suggestions')
            .upsert(payload, {
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
        const payload: AutomationSuggestionUpdate = {
            review_status: reviewStatus,
            reviewed_at: reviewedAt,
        };

        const { data, error } = await typedSupabase
            .from('automation_suggestions')
            .update(payload)
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
        try {
            const response = await apiClient.post<{ data?: unknown }>(
                '/api/v1/ai/analyze-resume',
                text,
                {
                    headers: { 'Content-Type': 'text/plain' },
                    timeout: 10000,
                }
            );
            const payload = unwrapApiResponseData(response.data);

            return {
                ...parseJsonObjectPayload(payload),
                isFallback: false,
            };
        } catch (error) {
            console.warn('[AI] resume analysis API unavailable; using client heuristic.', error);
            return {
                skills: extractSkillsFromText(text),
                experience_years: estimateExperienceYears(text),
                isFallback: true
            };
        }
    },

    getMatchScore: async (resumeText: string, jobDescription: string): Promise<AIObjectResponse> => {
        const response = await apiClient.post<{ data?: unknown }>(
            '/api/v1/ai/match-job',
            null,
            {
                params: { resumeText, jobDescription },
                timeout: 10000,
            }
        );

        return parseJsonObjectPayload(unwrapApiResponseData(response.data));
    },

    generateCareerPath: async (userId: string): Promise<AIObjectResponse> => {
        const response = await apiClient.get<{ data?: unknown }>(
            `/api/v1/ai/career-path/${encodeURIComponent(userId)}`,
            { timeout: 10000 }
        );
        const payload = unwrapApiResponseData(response.data);

        return payload && typeof payload === 'object' && !Array.isArray(payload)
            ? payload as AIObjectResponse
            : {};
    },

    getChatResponse: async (message: string): Promise<AIChatResponse> => {
        const response = await apiClient.post<{ data?: unknown }>(
            '/api/v1/ai/chat',
            { prompt: message },
            { timeout: 10000 }
        );
        const payload = unwrapApiResponseData(response.data);

        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
            return payload as AIChatResponse;
        }

        return {
            message: typeof payload === 'string' ? payload : '',
        };
    },

    getInsights: async () => {
        // Get platform insights from database instead of guessing
        const { count: userCount } = await typedSupabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        const { count: jobCount } = await typedSupabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PUBLISHED');
        
        const { count: courseCount } = await typedSupabase
            .from('courses')
            .select('*', { count: 'exact', head: true })
            .eq('is_published', true);
        
        return { 
            insight: `Join ${userCount || 0}+ professionals exploring ${jobCount || 0}+ job opportunities and ${courseCount || 0}+ courses on TalentSphere!`
        };
    }
};
