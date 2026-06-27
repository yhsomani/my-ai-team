import { test, expect } from '@playwright/test';
import { aiService, extractSkillsFromText, estimateExperienceYears } from '../src/services/aiService';
import { apiClient } from '../src/api/axios';

test.describe('aiService', () => {

    test.describe('Helper functions', () => {
        test('extractSkillsFromText should identify common skills in text', async () => {
            const text = "I am a Full Stack Developer with 5 years of experience in JavaScript, React, and Node.js. Also familiar with SQL and Docker.";
            const skills = extractSkillsFromText(text);
            expect(skills).toContain('javascript');
            expect(skills).toContain('react');
            expect(skills).toContain('node');
            expect(skills).toContain('sql');
            expect(skills).toContain('docker');
            expect(skills).not.toContain('python');
        });

        test('extractSkillsFromText should handle case insensitivity', async () => {
            const text = "PYTHON and JAVA developer";
            const skills = extractSkillsFromText(text);
            expect(skills).toContain('python');
            expect(skills).toContain('java');
        });

        test('estimateExperienceYears should extract years correctly', async () => {
            expect(estimateExperienceYears("I have 5 years of experience")).toBe(5);
            expect(estimateExperienceYears("10+ years in the industry")).toBe(10);
            expect(estimateExperienceYears("No experience mentioned")).toBe(0);
        });
    });

    test.describe('analyzeResume', () => {
        const originalPost = apiClient.post;

        test.afterEach(() => {
            apiClient.post = originalPost;
        });

        test('should return data from backend AI API when successful', async () => {
            const mockData = {
                summary: 'Backend analysis',
                skills: ['javascript', 'react'],
                suggestedJobs: ['Frontend Engineer']
            };

            apiClient.post = async (url, body, config) => {
                expect(url).toBe('/api/v1/ai/analyze-resume');
                expect(body).toBe('My resume text');
                expect(config).toEqual({
                    headers: { 'Content-Type': 'text/plain' },
                    timeout: 10000,
                });
                return { data: { data: mockData } } as any;
            };

            const result = await aiService.analyzeResume('My resume text');

            expect(result).toEqual({
                ...mockData,
                isFallback: false
            });
        });

        test('should execute fallback logic when backend AI API fails', async () => {
            const resumeText = "Experienced developer with 4 years of coding in TypeScript and Python.";

            apiClient.post = async () => {
                throw new Error('API unavailable');
            };

            const result = await aiService.analyzeResume(resumeText);

            expect(result).toEqual({
                skills: ['typescript', 'python'],
                experience_years: 4,
                isFallback: true
            });
        });
    });
});
