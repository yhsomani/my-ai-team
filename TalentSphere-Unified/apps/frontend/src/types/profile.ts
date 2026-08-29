export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  headline?: string;
  summary?: string;
  currentRole?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  avatarUrl?: string;
  skills?: string[];
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string;
  gpa?: number;
}

export interface Resume {
  id: string;
  userId: string;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications?: string[];
  languages?: { language: string; proficiency: string }[];
  projects?: { name: string; description: string; url?: string }[];
}
