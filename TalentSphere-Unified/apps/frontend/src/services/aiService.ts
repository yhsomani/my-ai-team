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
        // Store resume analysis in a table for tracking
        const { data, error } = await supabase
            .rpc('analyze_resume', { resume_text: text });
        
        if (error) {
            // Fallback: basic client-side analysis
            return {
                skills: extractSkillsFromText(text),
                experience_years: estimateExperienceYears(text),
                education_level: detectEducationLevel(text),
                suggestions: generateBasicSuggestions(text)
            };
        }
        return data;
    },

    getMatchScore: async (resumeText: string, jobDescription: string) => {
        // Client-side keyword matching as fallback
        const resumeKeywords = extractKeywords(resumeText);
        const jobKeywords = extractKeywords(jobDescription);
        
        const matchedKeywords = resumeKeywords.filter(k => jobKeywords.includes(k));
        const score = Math.round((matchedKeywords.length / jobKeywords.length) * 100) || 0;
        
        return {
            score,
            matched_skills: matchedKeywords,
            missing_skills: jobKeywords.filter(k => !resumeKeywords.includes(k)),
            suggestions: matchedKeywords.length < jobKeywords.length / 2 
                ? ['Consider adding more relevant skills from the job description']
                : ['Good match! Highlight your relevant experience in your cover letter']
        };
    },

    generateCareerPath: async (userId: string) => {
        // Get user's profile and skills to generate career path
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select(`
                *,
                skills (*),
                experiences (*)
            `)
            .eq('user_id', userId)
            .single();
        
        if (error) throw error;
        
        // Generate basic career path based on current role and skills
        const currentRole = profile?.current_role || 'Professional';
        const skillNames = profile?.skills?.map((s: any) => s.name) || [];
        
        return {
            current_position: currentRole,
            suggested_roles: getSuggestedRoles(currentRole, skillNames),
            skills_to_develop: suggestSkillsToDevelop(skillNames),
            recommended_courses: [],
            timeline: [
                { year: 1, goal: `Master ${skillNames[0] || 'core skills'} in your current role` },
                { year: 2, goal: 'Take on leadership responsibilities' },
                { year: 3, goal: 'Transition to senior or specialized role' },
                { year: 5, goal: 'Become an expert or move into management' }
            ]
        };
    },

    getChatResponse: async (message: string) => {
        // Simple rule-based chatbot responses
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('job') || lowerMessage.includes('career')) {
            return { message: "I can help you with your job search! Browse our job listings, update your profile, or apply to positions that match your skills. What would you like to do?" };
        } else if (lowerMessage.includes('skill') || lowerMessage.includes('learn')) {
            return { message: "Great! Continuous learning is key. Check out our courses section to develop new skills, or add your existing skills to your profile to get better job matches." };
        } else if (lowerMessage.includes('profile') || lowerMessage.includes('resume')) {
            return { message: "Your profile is your professional identity. Make sure to keep it updated with your latest experience, skills, and achievements. A complete profile gets more visibility!" };
        } else if (lowerMessage.includes('connect') || lowerMessage.includes('network')) {
            return { message: "Networking is powerful! Connect with colleagues, join conversations, and engage with others in your field. You never know where your next opportunity will come from." };
        } else if (lowerMessage.includes('challenge') || lowerMessage.includes('practice')) {
            return { message: "Challenges are a great way to practice and showcase your skills. Browse our coding challenges, submit solutions, and earn XP and badges!" };
        } else {
            return { message: "I'm here to help you succeed in your career journey. Ask me about jobs, skills, courses, networking, or anything else related to your professional development!" };
        }
    },

    getInsights: async () => {
        // Get platform insights from database
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

// Helper functions for client-side AI fallback
function extractSkillsFromText(text: string): string[] {
    const commonSkills = ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS', 'Docker', 'Git', 'TypeScript', 'HTML', 'CSS', 'Angular', 'Vue', 'MongoDB', 'PostgreSQL', 'REST API', 'GraphQL'];
    return commonSkills.filter(skill => text.toLowerCase().includes(skill.toLowerCase()));
}

function estimateExperienceYears(text: string): number {
    const yearMatches = text.match(/(\d{4})\s*[-–to]+\s*(\d{4}|present)/gi);
    if (!yearMatches) return 0;
    
    let totalYears = 0;
    yearMatches.forEach(match => {
        const years = match.match(/\d{4}/g);
        if (years && years.length === 2) {
            totalYears += parseInt(years[1]) - parseInt(years[0]);
        }
    });
    return totalYears;
}

function detectEducationLevel(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('phd') || lower.includes('doctorate')) return 'Doctorate';
    if (lower.includes('master') || lower.includes('msc') || lower.includes('mba')) return 'Master\'s';
    if (lower.includes('bachelor') || lower.includes('bsc') || lower.includes('ba')) return 'Bachelor\'s';
    if (lower.includes('diploma') || lower.includes('associate')) return 'Associate';
    return 'Not specified';
}

function generateBasicSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    if (text.length < 500) suggestions.push('Add more details about your experience and projects');
    if (!text.includes('@')) suggestions.push('Include your contact email');
    if (!text.match(/\d{4/)) suggestions.push('Add dates to your work experience');
    if (suggestions.length === 0) suggestions.push('Your resume looks good! Consider adding quantifiable achievements.');
    return suggestions;
}

function extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
    
    const stopwords = ['this', 'that', 'with', 'have', 'from', 'they', 'will', 'would', 'could', 'should', 'about', 'into', 'there', 'their', 'being', 'having', 'does', 'than', 'been', 'more', 'some', 'what', 'when', 'where', 'which', 'while', 'your', 'you\'re', 'we\'re', 'they\'re'];
    
    return [...new Set(words.filter(w => !stopwords.includes(w)))];
}

function getSuggestedRoles(currentRole: string, skills: string[]): string[] {
    const roleMappings: Record<string, string[]> = {
        'developer': ['Senior Developer', 'Tech Lead', 'Software Architect', 'Engineering Manager'],
        'engineer': ['Senior Engineer', 'Staff Engineer', 'Principal Engineer', 'Engineering Director'],
        'designer': ['Senior Designer', 'UX Lead', 'Design Director', 'Product Designer'],
        'manager': ['Senior Manager', 'Director', 'VP', 'Head of Department'],
        'analyst': ['Senior Analyst', 'Data Scientist', 'Business Intelligence Lead', 'Analytics Manager']
    };
    
    for (const [key, roles] of Object.entries(roleMappings)) {
        if (currentRole.toLowerCase().includes(key)) {
            return roles;
        }
    }
    
    return ['Senior ' + currentRole, 'Lead ' + currentRole, currentRole + ' Specialist', currentRole + ' Manager'];
}

function suggestSkillsToDevelop(currentSkills: string[]): string[] {
    const allSkills = ['Leadership', 'Communication', 'Project Management', 'Cloud Architecture', 'Machine Learning', 'DevOps', 'System Design', 'Agile', 'Mentoring', 'Public Speaking'];
    return allSkills.filter(s => !currentSkills.some(cs => cs.toLowerCase().includes(s.toLowerCase()))).slice(0, 5);
}
