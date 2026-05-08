import { test, expect } from '@playwright/test';
import { aiService, extractSkillsFromText, estimateExperienceYears } from '../src/services/aiService';
import { supabase } from '../src/lib/supabaseClient';

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
        const originalRpc = supabase.rpc;

        test.afterEach(() => {
            // Restore original rpc function
            supabase.rpc = originalRpc;
        });

        test('should return data from supabase rpc when successful', async () => {
            const mockData = {
                skills: ['javascript', 'react'],
                experience_years: 3,
                score: 85
            };

            // Mock the successful RPC call
            supabase.rpc = async (rpcName, params) => {
                expect(rpcName).toBe('analyze_resume');
                expect(params).toEqual({ resume_text: 'My resume text' });
                return { data: mockData, error: null } as any;
            };

            const result = await aiService.analyzeResume('My resume text');

            expect(result).toEqual({
                ...mockData,
                isFallback: false
            });
        });

        test('should execute fallback logic when supabase rpc fails', async () => {
            const resumeText = "Experienced developer with 4 years of coding in TypeScript and Python.";

            // Mock the failed RPC call
            supabase.rpc = async (rpcName, params) => {
                expect(rpcName).toBe('analyze_resume');
                return { data: null, error: new Error('RPC Failed') } as any;
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
