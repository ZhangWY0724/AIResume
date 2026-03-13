import type { ResumeEditorModuleKey, ResumeEditorTemplateId } from './types';

export interface ResumeEditorTemplateDefinition {
  id: ResumeEditorTemplateId;
  name: string;
  description: string;
}

export const RESUME_EDITOR_TEMPLATES: ResumeEditorTemplateDefinition[] = [
  {
    id: 'classic',
    name: '经典双栏',
    description: '适合社招与项目经历较多的简历。',
  },
  {
    id: 'compact',
    name: '紧凑单栏',
    description: '适合校招、ATS 和信息密度更高的场景。',
  },
];

export const DEFAULT_EDITOR_MODULES: ResumeEditorModuleKey[] = [
  'profile',
  'summary',
  'experience',
  'projects',
  'education',
  'skills',
];

export const RESUME_EDITOR_MODULE_LABELS: Record<ResumeEditorModuleKey, string> = {
  profile: '基础信息',
  summary: '个人简介',
  experience: '工作经历',
  projects: '项目经历',
  education: '教育经历',
  skills: '技能标签',
};

export const DEFAULT_EDITOR_ACCENT = '#2563eb';
export const DEFAULT_EDITOR_PAGE_SPACING = 'standard';
export const DEFAULT_EDITOR_LINE_HEIGHT = 'normal';
