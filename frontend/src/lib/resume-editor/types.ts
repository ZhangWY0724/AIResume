export type ResumeEditorModuleKey =
  | 'profile'
  | 'summary'
  | 'experience'
  | 'projects'
  | 'education'
  | 'skills';

export type ResumeEditorTemplateId = 'classic' | 'compact';

export interface ResumeEditorProfile {
  name: string;
  title: string;
  phone: string;
  email: string;
  location: string;
}

export interface ResumeEditorExperienceItem {
  id: string;
  company: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface ResumeEditorProjectItem {
  id: string;
  name: string;
  role: string;
  bullets: string[];
}

export interface ResumeEditorEducationItem {
  id: string;
  school: string;
  degree: string;
  major: string;
  period: string;
}

export interface ResumeEditorDocument {
  profile: ResumeEditorProfile;
  summary: string;
  skills: string[];
  experience: ResumeEditorExperienceItem[];
  projects: ResumeEditorProjectItem[];
  education: ResumeEditorEducationItem[];
  sourceText: string;
}

export interface ResumeEditorAppearance {
  accentColor: string;
  fontScale: 'sm' | 'md' | 'lg';
  pageSpacing: 'compact' | 'standard' | 'relaxed';
  lineHeight: 'tight' | 'normal' | 'relaxed';
}

export interface ResumeEditorDraft {
  templateId: ResumeEditorTemplateId;
  modules: ResumeEditorModuleKey[];
  hiddenModules: Partial<Record<ResumeEditorModuleKey, boolean>>;
  appearance: ResumeEditorAppearance;
  document: ResumeEditorDocument;
}
