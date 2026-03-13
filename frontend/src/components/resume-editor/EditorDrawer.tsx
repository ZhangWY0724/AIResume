import { ChevronDown, ChevronUp, PencilLine, Plus, Trash2, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  educationFieldSchemas,
  experienceFieldSchemas,
  profileFieldSchemas,
  projectFieldSchemas,
  type EditorFieldSchema,
} from '@/lib/resume-editor/schemas';
import { RESUME_EDITOR_MODULE_LABELS } from '@/lib/resume-editor/templates';
import type {
  ResumeEditorDraft,
  ResumeEditorEducationItem,
  ResumeEditorExperienceItem,
  ResumeEditorModuleKey,
  ResumeEditorProfile,
  ResumeEditorProjectItem,
} from '@/lib/resume-editor/types';
import { cn } from '@/lib/utils';

type EditorDrawerProps = {
  draft: ResumeEditorDraft;
  activeModule: ResumeEditorModuleKey | null;
  onClose: () => void;
  onMoveModule: (module: ResumeEditorModuleKey, direction: 'up' | 'down') => void;
  onToggleModule: (module: ResumeEditorModuleKey) => void;
  onUpdateProfileField: (field: keyof ResumeEditorProfile, value: string) => void;
  onUpdateSummary: (summary: string) => void;
  onUpdateSkills: (skills: string[]) => void;
  onAddExperience: () => void;
  onUpdateExperience: (id: string, field: keyof ResumeEditorExperienceItem, value: string | string[]) => void;
  onRemoveExperience: (id: string) => void;
  onAddProject: () => void;
  onUpdateProject: (id: string, field: keyof ResumeEditorProjectItem, value: string | string[]) => void;
  onRemoveProject: (id: string) => void;
  onAddEducation: () => void;
  onUpdateEducation: (id: string, field: keyof ResumeEditorEducationItem, value: string) => void;
  onRemoveEducation: (id: string) => void;
};

export function EditorDrawer({
  draft,
  activeModule,
  onClose,
  onMoveModule,
  onToggleModule,
  onUpdateProfileField,
  onUpdateSummary,
  onUpdateSkills,
  onAddExperience,
  onUpdateExperience,
  onRemoveExperience,
  onAddProject,
  onUpdateProject,
  onRemoveProject,
  onAddEducation,
  onUpdateEducation,
  onRemoveEducation,
}: EditorDrawerProps) {
  if (!activeModule) {
    return null;
  }

  const currentIndex = draft.modules.indexOf(activeModule);
  const isVisible = !draft.hiddenModules[activeModule];

  return (
    <>
      <div className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-40 h-full w-full max-w-[440px] border-l border-slate-200 bg-white shadow-[-16px_0_60px_rgba(15,23,42,0.16)]">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Block Editor</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">{RESUME_EDITOR_MODULE_LABELS[activeModule]}</h2>
              <p className="mt-1 text-sm text-slate-500">当前只编辑这个区域，画布保持实时预览。</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onMoveModule(activeModule, 'up')}
                disabled={currentIndex <= 0}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                上移
              </button>
              <button
                onClick={() => onMoveModule(activeModule, 'down')}
                disabled={currentIndex === -1 || currentIndex >= draft.modules.length - 1}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                下移
              </button>
              <button
                onClick={() => onToggleModule(activeModule)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  isVisible
                    ? 'border-slate-200 text-slate-600 hover:border-slate-300'
                    : 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300',
                )}
              >
                <PencilLine className="h-3.5 w-3.5" />
                {isVisible ? '隐藏模块' : '显示模块'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {renderModuleEditor({
              draft,
              activeModule,
              onUpdateProfileField,
              onUpdateSummary,
              onUpdateSkills,
              onAddExperience,
              onUpdateExperience,
              onRemoveExperience,
              onAddProject,
              onUpdateProject,
              onRemoveProject,
              onAddEducation,
              onUpdateEducation,
              onRemoveEducation,
            })}
          </div>
        </div>
      </aside>
    </>
  );
}

function renderModuleEditor(props: {
  draft: ResumeEditorDraft;
  activeModule: ResumeEditorModuleKey;
  onUpdateProfileField: (field: keyof ResumeEditorProfile, value: string) => void;
  onUpdateSummary: (summary: string) => void;
  onUpdateSkills: (skills: string[]) => void;
  onAddExperience: () => void;
  onUpdateExperience: (id: string, field: keyof ResumeEditorExperienceItem, value: string | string[]) => void;
  onRemoveExperience: (id: string) => void;
  onAddProject: () => void;
  onUpdateProject: (id: string, field: keyof ResumeEditorProjectItem, value: string | string[]) => void;
  onRemoveProject: (id: string) => void;
  onAddEducation: () => void;
  onUpdateEducation: (id: string, field: keyof ResumeEditorEducationItem, value: string) => void;
  onRemoveEducation: (id: string) => void;
}) {
  const { draft, activeModule } = props;

  switch (activeModule) {
    case 'profile':
      return (
        <div className="space-y-4">
          <SchemaFields<ResumeEditorProfile>
            fields={profileFieldSchemas}
            value={draft.document.profile}
            onChange={props.onUpdateProfileField}
          />
        </div>
      );
    case 'summary':
      return (
        <Field label="个人简介">
          <textarea
            value={draft.document.summary}
            onChange={(event) => props.onUpdateSummary(event.target.value)}
            rows={7}
            className={inputClassName}
            placeholder="突出岗位方向、能力标签和代表性成果。"
          />
        </Field>
      );
    case 'skills':
      return (
        <Field label="技能标签">
          <textarea
            value={draft.document.skills.join(', ')}
            onChange={(event) => props.onUpdateSkills(splitByComma(event.target.value))}
            rows={5}
            className={inputClassName}
            placeholder="多个技能用英文逗号分隔。"
          />
        </Field>
      );
    case 'experience':
      return (
        <ListEditor
          title="工作经历"
          emptyText="还没有工作经历，点击添加开始补充。"
          onAdd={props.onAddExperience}
        >
          {draft.document.experience.map((item, index) => (
            <ItemCard
              key={item.id}
              title={item.role || item.company || '未命名经历'}
              subtitle={[item.company, item.period].filter(Boolean).join(' · ')}
              defaultExpanded={index === 0}
              onRemove={() => props.onRemoveExperience(item.id)}
            >
              <SchemaFields<ResumeEditorExperienceItem>
                fields={experienceFieldSchemas}
                value={item}
                onChange={(key, value) => props.onUpdateExperience(item.id, key, normalizeSchemaValue(String(key), value))}
              />
            </ItemCard>
          ))}
        </ListEditor>
      );
    case 'projects':
      return (
        <ListEditor
          title="项目经历"
          emptyText="还没有项目经历，点击添加开始补充。"
          onAdd={props.onAddProject}
        >
          {draft.document.projects.map((item, index) => (
            <ItemCard
              key={item.id}
              title={item.name || '未命名项目'}
              subtitle={item.role}
              defaultExpanded={index === 0}
              onRemove={() => props.onRemoveProject(item.id)}
            >
              <SchemaFields<ResumeEditorProjectItem>
                fields={projectFieldSchemas}
                value={item}
                onChange={(key, value) => props.onUpdateProject(item.id, key, normalizeSchemaValue(String(key), value))}
              />
            </ItemCard>
          ))}
        </ListEditor>
      );
    case 'education':
      return (
        <ListEditor
          title="教育经历"
          emptyText="还没有教育经历，点击添加开始补充。"
          onAdd={props.onAddEducation}
        >
          {draft.document.education.map((item, index) => (
            <ItemCard
              key={item.id}
              title={item.school || '未命名教育经历'}
              subtitle={[item.degree, item.major, item.period].filter(Boolean).join(' · ')}
              defaultExpanded={index === 0}
              onRemove={() => props.onRemoveEducation(item.id)}
            >
              <SchemaFields<ResumeEditorEducationItem>
                fields={educationFieldSchemas}
                value={item}
                onChange={(key, value) => props.onUpdateEducation(item.id, key, value)}
              />
            </ItemCard>
          ))}
        </ListEditor>
      );
    default:
      return null;
  }
}

function splitByComma(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeSchemaValue(key: string, value: string): string | string[] {
  return key === 'bullets'
    ? value.split('\n').map((line) => line.trim()).filter(Boolean)
    : value;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function SchemaFields<T extends object>({
  fields,
  value,
  onChange,
}: {
  fields: EditorFieldSchema<T>[];
  value: T;
  onChange: (key: keyof T, value: string) => void;
}) {
  return (
    <>
      {fields.map((field) => {
        const fieldValue = value[field.key];
        const normalizedValue = Array.isArray(fieldValue) ? fieldValue.join('\n') : String(fieldValue ?? '');

        return (
          <Field key={String(field.key)} label={field.label}>
            {field.type === 'textarea' ? (
              <textarea
                value={normalizedValue}
                onChange={(event) => onChange(field.key, event.target.value)}
                rows={field.rows ?? 4}
                placeholder={field.placeholder}
                className={inputClassName}
              />
            ) : field.type === 'select' ? (
              <select
                value={normalizedValue}
                onChange={(event) => onChange(field.key, event.target.value)}
                className={inputClassName}
              >
                <option value="">请选择</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={normalizedValue}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder={field.placeholder}
                className={inputClassName}
              />
            )}
          </Field>
        );
      })}
    </>
  );
}

function ListEditor({
  title,
  onAdd,
  emptyText,
  children,
}: {
  title: string;
  onAdd: () => void;
  emptyText: string;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          添加
        </button>
      </div>
      <div className="space-y-4">
        {items.length > 0 && items[0] ? items : <p className="text-sm text-slate-500">{emptyText}</p>}
      </div>
    </div>
  );
}

function ItemCard({
  title,
  subtitle,
  defaultExpanded = false,
  onRemove,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultExpanded?: boolean;
  onRemove: () => void;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setExpanded((value) => !value)} className="min-w-0 flex-1 text-left">
          <h4 className="truncate text-sm font-semibold text-slate-900">{title}</h4>
          {subtitle && <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p>}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? '收起' : '展开'}
          </button>
          <button
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-red-200 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        </div>
      </div>
      {expanded && <div className="space-y-4">{children}</div>}
    </div>
  );
}

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400';
