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
