import type {
  ResumeEditorEducationItem,
  ResumeEditorExperienceItem,
  ResumeEditorProfile,
  ResumeEditorProjectItem,
} from './types';

export type EditorFieldType = 'text' | 'textarea';
export type EditorFieldOption = {
  label: string;
  value: string;
};

export interface EditorFieldSchema<T> {
  key: keyof T;
  label: string;
  type: EditorFieldType | 'select';
  rows?: number;
  placeholder?: string;
  options?: EditorFieldOption[];
}

export const EDUCATION_DEGREE_OPTIONS: EditorFieldOption[] = [
  { label: '专科', value: '专科' },
  { label: '本科', value: '本科' },
  { label: '硕士', value: '硕士' },
  { label: '博士', value: '博士' },
  { label: 'MBA', value: 'MBA' },
  { label: '其他', value: '其他' },
];

export const profileFieldSchemas: EditorFieldSchema<ResumeEditorProfile>[] = [
  { key: 'name', label: '姓名', type: 'text', placeholder: '例如：张三' },
  { key: 'title', label: '目标岗位', type: 'text', placeholder: '例如：高级前端工程师' },
  { key: 'phone', label: '手机号', type: 'text', placeholder: '例如：13800000000' },
  { key: 'email', label: '邮箱', type: 'text', placeholder: '例如：name@example.com' },
  { key: 'location', label: '所在地', type: 'text', placeholder: '例如：上海' },
];

export const experienceFieldSchemas: EditorFieldSchema<ResumeEditorExperienceItem>[] = [
  { key: 'company', label: '公司', type: 'text', placeholder: '例如：某科技有限公司' },
  { key: 'role', label: '岗位', type: 'text', placeholder: '例如：前端负责人' },
  { key: 'period', label: '时间', type: 'text', placeholder: '例如：2022.03 - 至今' },
  { key: 'bullets', label: '要点', type: 'textarea', rows: 4, placeholder: '每行一条，突出结果和指标' },
];

export const projectFieldSchemas: EditorFieldSchema<ResumeEditorProjectItem>[] = [
  { key: 'name', label: '项目名称', type: 'text', placeholder: '例如：招聘中台重构' },
  { key: 'role', label: '角色', type: 'text', placeholder: '例如：项目负责人 / 核心开发' },
  { key: 'bullets', label: '要点', type: 'textarea', rows: 4, placeholder: '每行一条，优先写成果' },
];

export const educationFieldSchemas: EditorFieldSchema<ResumeEditorEducationItem>[] = [
  { key: 'school', label: '学校', type: 'text', placeholder: '例如：复旦大学' },
  { key: 'degree', label: '学历', type: 'select', options: EDUCATION_DEGREE_OPTIONS },
  { key: 'major', label: '专业', type: 'text', placeholder: '例如：软件工程' },
  { key: 'period', label: '时间', type: 'text', placeholder: '例如：2018.09 - 2022.06' },
];
