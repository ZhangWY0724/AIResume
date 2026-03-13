import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  AlertTriangle,
  Eye,
  EyeOff,
  FileText,
  LayoutTemplate,
  Palette,
  PenSquare,
  RefreshCcw,
  Save,
  Settings2,
} from 'lucide-react';
import { useBeforeUnload, useLocation, useNavigate } from 'react-router-dom';
import { EditorDrawer } from '@/components/resume-editor/EditorDrawer';
import { ExportPreviewModal } from '@/components/resume-editor/ExportPreviewModal';
import {
  createResumeExportPages,
  downloadResumePdf,
  printResumePages,
  type ResumeExportPage,
} from '@/lib/resume-editor/export';
import { RESUME_EDITOR_DEMO_TEXT } from '@/lib/resume-editor/mock';
import { ResumeCanvas } from '@/components/resume-editor/ResumeCanvas';
import { RESUME_EDITOR_MODULE_LABELS, RESUME_EDITOR_TEMPLATES } from '@/lib/resume-editor/templates';
import type { ResumeEditorDraft, ResumeEditorModuleKey } from '@/lib/resume-editor/types';
import { cn } from '@/lib/utils';
import { useResumeEditorStore } from '@/store/useResumeEditorStore';
import { useResumeStore } from '@/store/useResumeStore';

type EditorLocationState = {
  sourceText?: string;
};

const ACCENT_PRESETS = ['#2563eb', '#0f766e', '#c2410c', '#7c3aed', '#be123c'];

export default function ResumeEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resumeContent } = useResumeStore();
  const state = location.state as EditorLocationState | null;
  const {
    draft,
    draftId,
    initialized,
    dirty,
    loading,
    saving,
    saveError,
    lastSavedAt,
    initialize,
    hydrate,
    saveRemoteDraft,
    reset,
    setTemplate,
    setAccentColor,
    setFontScale,
    setPageSpacing,
    setLineHeight,
    updateProfileField,
    updateSummary,
    updateSkills,
    addExperience,
    updateExperience,
    removeExperience,
    addProject,
    updateProject,
    removeProject,
    addEducation,
    updateEducation,
    removeEducation,
    toggleModule,
    moveModule,
    reorderModule,
  } = useResumeEditorStore();
  const [activeModule, setActiveModule] = useState<ResumeEditorModuleKey | null>(null);
  const [hoveredModule, setHoveredModule] = useState<ResumeEditorModuleKey | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportPages, setExportPages] = useState<ResumeExportPage[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const draftIdFromQuery = useMemo(() => searchParams.get('draftId'), [searchParams]);
  const isDemoMode = useMemo(
    () => location.pathname === '/editor-demo' || searchParams.get('demo') === '1',
    [location.pathname, searchParams],
  );
  const sourceText = useMemo(() => {
    if (isDemoMode) {
      return RESUME_EDITOR_DEMO_TEXT;
    }

    return state?.sourceText?.trim() || resumeContent.trim();
  }, [isDemoMode, resumeContent, state?.sourceText]);

  useEffect(() => {
    if (draftIdFromQuery) {
      void hydrate(draftIdFromQuery);
      return;
    }

    if (!sourceText) {
      navigate('/upload');
      return;
    }

    initialize(sourceText);
  }, [draftIdFromQuery, hydrate, initialize, navigate, sourceText]);

  useEffect(() => {
    if (!draftId || !dirty || !draft) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveRemoteDraft();
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [draftId, draft, dirty, saveRemoteDraft]);

  useEffect(() => {
    if (!draft || !activeModule) {
      return;
    }

    if (!draft.modules.includes(activeModule)) {
      setActiveModule(null);
    }
  }, [activeModule, draft]);

  const shouldWarnBeforeLeave = dirty && !saving;

  useBeforeUnload(
    useMemo(
      () => (event) => {
        if (!shouldWarnBeforeLeave) {
          return;
        }

        event.preventDefault();
        event.returnValue = '';
      },
      [shouldWarnBeforeLeave],
    ),
  );

  const confirmLeave = () => window.confirm('当前模板内容尚未稳定保存，离开编辑器后本次修改可能丢失，确认继续离开吗？');

  if (loading || !initialized || !draft) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <p className="text-base font-medium text-slate-700">正在初始化模板编辑器</p>
          <p className="mt-2 text-sm text-slate-500">正在读取草稿或生成第一版结构化内容。</p>
        </div>
      </div>
    );
  }

  const waitForPaint = async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  };

  const generateExportPreview = async () => {
    setActiveModule(null);
    setHoveredModule(null);
    setExportOpen(true);
    setExportLoading(true);
    setExportError(null);

    try {
      await waitForPaint();

      if (!canvasRef.current) {
        throw new Error('模板容器尚未就绪，请稍后重试');
      }

      const pages = await createResumeExportPages(canvasRef.current);
      setExportPages(pages);
    } catch (error: any) {
      setExportPages([]);
      setExportError(error?.message || '生成导出预览失败');
    } finally {
      setExportLoading(false);
    }
  };

  const getExportFileName = () => {
    const name = draft.document.profile.name?.trim() || 'resume';
    return `${name.replace(/[\\/:*?"<>|]/g, '_')}-模板简历.pdf`;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_eef2ff_100%)]">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={() => {
                if (shouldWarnBeforeLeave && !confirmLeave()) {
                  return;
                }

                navigate(-1);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Resume Editor</p>
              <h1 className="text-xl font-bold text-slate-900">模板简历编辑器</h1>
              <p className="mt-1 text-xs text-slate-500">
                {isDemoMode
                  ? '当前为调试样例模式，不依赖 AI 结果。'
                  : saving
                    ? '正在保存草稿...'
                    : dirty
                      ? '有未保存修改'
                      : lastSavedAt
                        ? `上次保存：${new Date(lastSavedAt).toLocaleString()}`
                        : '本地草稿已初始化'}
              </p>
            </div>
          </div>

          <div className="hidden flex-[0_0_560px] justify-center xl:flex">
            <div className="inline-flex min-h-[64px] w-[560px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-amber-200 bg-amber-50 px-6 py-3 text-center text-sm font-medium text-amber-700 shadow-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>当前模板数据为实时渲染结果，离开页面可能导致本次修改丢失</span>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <button
              onClick={() => void generateExportPreview()}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              <FileText className="h-4 w-4" />
              导出预览
            </button>
            <button
              onClick={async () => {
                const savedDraftId = await saveRemoteDraft();
                if (savedDraftId && savedDraftId !== draftId) {
                  navigate(`/editor?draftId=${encodeURIComponent(savedDraftId)}`, { replace: true });
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <Save className="h-4 w-4" />
              {saving ? '保存中...' : draftId ? '保存草稿' : '创建草稿'}
            </button>
          </div>
        </div>

        <div className="border-t border-amber-100 bg-amber-50/90 px-4 py-2 text-center text-xs font-medium text-amber-700 xl:hidden">
          当前模板数据为实时渲染结果，离开页面可能导致本次修改丢失
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[320px_1fr] md:px-6">
        <aside className="space-y-6">
          <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">模板选择</h2>
            </div>
            <div className="mt-4 space-y-3">
              {RESUME_EDITOR_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setTemplate(template.id)}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-3 text-left transition',
                    draft.templateId === template.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                  )}
                >
                  <div className="font-medium">{template.name}</div>
                  <div className={cn('mt-1 text-xs', draft.templateId === template.id ? 'text-slate-300' : 'text-slate-500')}>
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">视觉设置</h2>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">强调色</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAccentColor(preset)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition',
                      draft.appearance.accentColor === preset ? 'scale-110 border-slate-900' : 'border-white',
                    )}
                    style={{ backgroundColor: preset }}
                    title={preset}
                  />
                ))}
              </div>
            </div>
            <OptionGroup
              title="字号"
              options={[
                { value: 'sm', label: 'SM' },
                { value: 'md', label: 'MD' },
                { value: 'lg', label: 'LG' },
              ]}
              currentValue={draft.appearance.fontScale}
              onChange={(value) => setFontScale(value as ResumeEditorDraft['appearance']['fontScale'])}
            />
            <OptionGroup
              title="页边距"
              options={[
                { value: 'compact', label: '紧凑' },
                { value: 'standard', label: '标准' },
                { value: 'relaxed', label: '舒展' },
              ]}
              currentValue={draft.appearance.pageSpacing}
              onChange={(value) => setPageSpacing(value as ResumeEditorDraft['appearance']['pageSpacing'])}
            />
            <OptionGroup
              title="行距"
              options={[
                { value: 'tight', label: '紧密' },
                { value: 'normal', label: '标准' },
                { value: 'relaxed', label: '宽松' },
              ]}
              currentValue={draft.appearance.lineHeight}
              onChange={(value) => setLineHeight(value as ResumeEditorDraft['appearance']['lineHeight'])}
            />
          </section>

          <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">模块编排</h2>
              </div>
              <button
                onClick={() => reset()}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-900"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                重置草稿
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">在右侧简历画布中直接拖动模块即可排序，这里保留显隐和精细调整。</p>
            <div className="mt-4 space-y-2">
              {draft.modules.map((module, index) => {
                const isVisible = !draft.hiddenModules[module];
                const isFirst = index === 0;
                const isLast = index === draft.modules.length - 1;
                const isActive = activeModule === module;

                return (
                  <div
                    key={module}
                    className={cn(
                      'rounded-2xl border px-3 py-3 transition',
                      isActive ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{RESUME_EDITOR_MODULE_LABELS[module]}</p>
                        <p className={cn('mt-1 text-xs', isActive ? 'text-slate-300' : 'text-slate-500')}>
                          {isVisible ? '当前显示' : '当前隐藏'}
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveModule(module)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition',
                          isActive
                            ? 'bg-white/15 text-white hover:bg-white/20'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                        )}
                      >
                        <PenSquare className="h-3.5 w-3.5" />
                        编辑
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => moveModule(module, 'up')}
                        disabled={isFirst}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
                          isActive
                            ? 'bg-white/10 text-white hover:bg-white/15'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                        )}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                        上移
                      </button>
                      <button
                        onClick={() => moveModule(module, 'down')}
                        disabled={isLast}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
                          isActive
                            ? 'bg-white/10 text-white hover:bg-white/15'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                        )}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                        下移
                      </button>
                      <button
                        onClick={() => toggleModule(module)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition',
                          isActive
                            ? 'bg-white/10 text-white hover:bg-white/15'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                        )}
                      >
                        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {isVisible ? '隐藏' : '显示'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="min-w-0">
          {saveError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          )}
          <div className={cn(activeModule && 'pr-[0px] lg:pr-[380px] xl:pr-[420px]')}>
            <ResumeCanvas
              ref={canvasRef}
              draft={draft}
              activeModule={activeModule}
              hoveredModule={hoveredModule}
              onModuleHover={setHoveredModule}
              onModuleSelect={setActiveModule}
              onModuleReorder={reorderModule}
            />
          </div>
        </section>
      </div>

      <EditorDrawer
        draft={draft}
        activeModule={activeModule}
        onClose={() => setActiveModule(null)}
        onMoveModule={moveModule}
        onToggleModule={toggleModule}
        onUpdateProfileField={updateProfileField}
        onUpdateSummary={updateSummary}
        onUpdateSkills={updateSkills}
        onAddExperience={addExperience}
        onUpdateExperience={updateExperience}
        onRemoveExperience={removeExperience}
        onAddProject={addProject}
        onUpdateProject={updateProject}
        onRemoveProject={removeProject}
        onAddEducation={addEducation}
        onUpdateEducation={updateEducation}
        onRemoveEducation={removeEducation}
      />

      <ExportPreviewModal
        open={exportOpen}
        loading={exportLoading}
        pages={exportPages}
        error={exportError}
        onClose={() => {
          setExportOpen(false);
          setExportError(null);
        }}
        onDownloadPdf={() => downloadResumePdf(exportPages, getExportFileName())}
        onPrint={() => printResumePages(exportPages)}
      />
    </div>
  );
}

function OptionGroup({
  title,
  options,
  currentValue,
  onChange,
}: {
  title: string;
  options: Array<{ value: string; label: string }>;
  currentValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-5">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm transition',
              currentValue === option.value
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
