import { apiClient } from '../api/axios';

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
        const response = await apiClient.post('/api/v1/ai/analyze-resume', { resumeText: text });
        return response.data;
    },

    getMatchScore: async (resumeText: string, jobDescription: string) => {
        const response = await apiClient.post('/api/v1/ai/match-job', { resumeText, jobDescription });
        return response.data;
    },

    generateCareerPath: async (userId: string) => {
        const response = await apiClient.get(`/api/v1/ai/career-path/${userId}`);
        return response.data;
    },

    getChatResponse: async (message: string) => {
        const response = await apiClient.post('/api/v1/ai/chat', { prompt: message });
        return response.data as { message: string };
    },

    getInsights: async () => {
        const response = await apiClient.get('/api/v1/ai/insights');
        return response.data as { insight: string };
    }
};
