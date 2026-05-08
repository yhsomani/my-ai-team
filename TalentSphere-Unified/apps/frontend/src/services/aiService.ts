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

export const aiService = {
    analyzeResume: async (text: string) => {
        const { data, error } = await supabase.functions.invoke('analyze-resume', {
            body: { text }
        });
        
        if (error) throw error;
        return data;
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
