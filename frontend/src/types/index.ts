export interface PersonalInfo {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  summary?: string;
}

export interface WorkExperience {
  id?: number;
  company: string;
  title: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  description?: string;
  achievements: string[];
}

export interface Education {
  id?: number;
  institution: string;
  degree: string;
  field: string;
  start_date: string;
  end_date?: string;
  gpa?: number;
  achievements: string[];
}

export interface Skill {
  id?: number;
  name: string;
  category: string;
  proficiency_level: number;
}

export interface Project {
  id?: number;
  name: string;
  description?: string;
  technologies: string[];
  url?: string;
  highlights: string[];
}

export interface Certification {
  id?: number;
  name: string;
  issuer: string;
  date?: string;
  url?: string;
}

export interface Publication {
  id?: number;
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
}

export interface FullProfile {
  personal_info: PersonalInfo | null;
  work_experience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  publications: Publication[];
}

export interface TailoredExperience {
  company: string;
  title: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  bullets: string[];
}

export interface TailoredEducation {
  institution: string;
  degree: string;
  field: string;
  end_date?: string;
  gpa?: number;
  highlights: string[];
}

export interface TailoredProject {
  name: string;
  description: string;
  technologies: string[];
  highlights: string[];
}

export interface TailoredResume {
  professional_summary: string;
  experiences: TailoredExperience[];
  education: TailoredEducation[];
  skills: string[];
  projects: TailoredProject[];
  certifications: string[];
}

export interface ResumeGenerateResponse {
  id: number;
  job_title: string;
  company?: string;
  tailored_resume: TailoredResume;
  ai_model_used: string;
  created_at: string;
}

export interface ResumeHistoryItem {
  id: number;
  job_title: string;
  company?: string;
  ai_model_used: string;
  created_at: string;
}

export interface ModelOption {
  id?: number;
  value: string;
  label: string;
  provider: string;
  custom?: boolean;
  builtin?: boolean;
}

export interface AppSettings {
  google_api_key: string;
  gemini_api_key: string;
  openai_api_key: string;
  anthropic_api_key: string;
  ollama_base_url: string;
  default_model: string;
  embedding_model: string;
}

export interface JobAnalysis {
  job_title: string;
  company?: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_level?: string;
  years_of_experience?: string;
  key_responsibilities: string[];
  keywords: string[];
  education_requirements?: string;
  nice_to_haves: string[];
  raw_text: string;
}
