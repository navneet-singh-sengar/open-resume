import axios from 'axios';
import type {
  PersonalInfo,
  WorkExperience,
  Education,
  Skill,
  Project,
  Certification,
  Publication,
  FullProfile,
  TailoredResume,
  ResumeGenerateResponse,
  ResumeHistoryItem,
  JobAnalysis,
  AppSettings,
  ModelOption,
} from '../types';

const api = axios.create({ baseURL: '/api' });

// Profile
export const getFullProfile = () => api.get<FullProfile>('/profile/').then(r => r.data);

export const getPersonalInfo = () => api.get<PersonalInfo | null>('/profile/personal').then(r => r.data);
export const upsertPersonalInfo = (data: PersonalInfo) => api.post<PersonalInfo>('/profile/personal', data).then(r => r.data);

export const listExperience = () => api.get<WorkExperience[]>('/profile/experience').then(r => r.data);
export const createExperience = (data: WorkExperience) => api.post<WorkExperience>('/profile/experience', data).then(r => r.data);
export const updateExperience = (id: number, data: Partial<WorkExperience>) => api.put<WorkExperience>(`/profile/experience/${id}`, data).then(r => r.data);
export const deleteExperience = (id: number) => api.delete(`/profile/experience/${id}`);

export const listEducation = () => api.get<Education[]>('/profile/education').then(r => r.data);
export const createEducation = (data: Education) => api.post<Education>('/profile/education', data).then(r => r.data);
export const updateEducation = (id: number, data: Partial<Education>) => api.put<Education>(`/profile/education/${id}`, data).then(r => r.data);
export const deleteEducation = (id: number) => api.delete(`/profile/education/${id}`);

export const listSkills = () => api.get<Skill[]>('/profile/skills').then(r => r.data);
export const createSkill = (data: Skill) => api.post<Skill>('/profile/skills', data).then(r => r.data);
export const updateSkill = (id: number, data: Partial<Skill>) => api.put<Skill>(`/profile/skills/${id}`, data).then(r => r.data);
export const deleteSkill = (id: number) => api.delete(`/profile/skills/${id}`);

export const listProjects = () => api.get<Project[]>('/profile/projects').then(r => r.data);
export const createProject = (data: Project) => api.post<Project>('/profile/projects', data).then(r => r.data);
export const updateProject = (id: number, data: Partial<Project>) => api.put<Project>(`/profile/projects/${id}`, data).then(r => r.data);
export const deleteProject = (id: number) => api.delete(`/profile/projects/${id}`);

export const listCertifications = () => api.get<Certification[]>('/profile/certifications').then(r => r.data);
export const createCertification = (data: Certification) => api.post<Certification>('/profile/certifications', data).then(r => r.data);
export const updateCertification = (id: number, data: Partial<Certification>) => api.put<Certification>(`/profile/certifications/${id}`, data).then(r => r.data);
export const deleteCertification = (id: number) => api.delete(`/profile/certifications/${id}`);

export const listPublications = () => api.get<Publication[]>('/profile/publications').then(r => r.data);
export const createPublication = (data: Publication) => api.post<Publication>('/profile/publications', data).then(r => r.data);
export const updatePublication = (id: number, data: Partial<Publication>) => api.put<Publication>(`/profile/publications/${id}`, data).then(r => r.data);
export const deletePublication = (id: number) => api.delete(`/profile/publications/${id}`);

// Resume Import
export const importResume = (data: { resume_text: string; model?: string }) =>
  api.post<{ profile: FullProfile; counts: Record<string, number>; skipped: Record<string, number> }>('/profile/import-resume', data).then(r => r.data);

export const importResumeFile = (file: File, model?: string) => {
  const form = new FormData();
  form.append('file', file);
  if (model) form.append('model', model);
  return api.post<{ profile: FullProfile; counts: Record<string, number>; skipped: Record<string, number> }>('/profile/import-resume-file', form).then(r => r.data);
};

// Job Analysis
export const analyzeJob = (data: { text?: string; url?: string }) =>
  api.post<JobAnalysis>('/job/analyze', data).then(r => r.data);

// Resume
export const generateResume = (data: { job_text?: string; job_url?: string; model?: string }) =>
  api.post<ResumeGenerateResponse>('/resume/generate', data).then(r => r.data);

export const getResumeHistory = () => api.get<ResumeHistoryItem[]>('/resume/history').then(r => r.data);

export const getResume = (id: number) => api.get<ResumeGenerateResponse>(`/resume/${id}`).then(r => r.data);

export const updateResume = (id: number, tailored_resume: TailoredResume) =>
  api.put<ResumeGenerateResponse>(`/resume/${id}`, { tailored_resume }).then(r => r.data);

export const deleteResume = (id: number) => api.delete(`/resume/${id}`);

export const getResumeDownloadUrl = (id: number) => `/api/resume/${id}/download`;

// Settings
export const getSettings = () => api.get<AppSettings>('/settings/').then(r => r.data);
export const updateSettings = (settings: Partial<AppSettings>) =>
  api.put<{ updated: string[] }>('/settings/', { settings }).then(r => r.data);

// Ollama & Setup Status
export const getOllamaStatus = () => api.get<{ running: boolean; models: string[] }>('/settings/ollama-status').then(r => r.data);
export const getSetupStatus = () => api.get<{ has_api_key: boolean; has_profile: boolean }>('/settings/setup-status').then(r => r.data);

// Models
export const getModels = () => api.get<ModelOption[]>('/settings/models').then(r => r.data);
export const getHiddenModels = () => api.get<ModelOption[]>('/settings/models/hidden').then(r => r.data);
export const addModel = (data: { value: string; label: string; provider: string }) =>
  api.post<ModelOption>('/settings/models', data).then(r => r.data);
export const deleteModel = (id: number) => api.delete(`/settings/models/${id}`);
export const hideModel = (value: string) => api.post('/settings/models/hide', { value });
export const unhideModel = (value: string) => api.post('/settings/models/unhide', { value });
