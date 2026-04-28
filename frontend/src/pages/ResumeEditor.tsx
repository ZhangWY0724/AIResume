import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronRight,
  Minus,
  Plus,
  Maximize2,
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

const ACCENT_PRESETS = ['#2563eb', '#0f766e', '#c2410c', '#7c3aed', '#be123c'];export default function ResumeEditor() {
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
  const [activeTab, setActiveTab] = useState<'template' | 'style' | 'structure'>('template');
  const [zoom, setZoom] = useState(0.75);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportPages, setExportPages] = useState<ResumeExportPage[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.4));
  const handleResetZoom = () => {
    setZoom(0.75);
  };

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
    <div className="min-h-screen bg-[#f1f5f9] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 pointer-events-none" />
      
      <header className="sticky top-4 z-20 mx-4 mb-6 flex items-center justify-between gap-4 rounded-[24px] border border-white/80 bg-white/70 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-xl md:mx-6 md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <button
            onClick={() => {
              if (shouldWarnBeforeLeave && !confirmLeave()) {
                return;
              }
              navigate(-1);
            }}
            className="group flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow-md active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
                {draft.document.profile.name || '未命名简历'}
              </h1>
              <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:block">
                Editor
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {saving ? (
                <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                  <RefreshCcw className="h-3 w-3 animate-spin" />
                  正在自动保存...
                </span>
              ) : dirty ? (
                <span className="text-amber-600 font-medium">未保存修改</span>
              ) : (
                `已保存于 ${lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '刚刚'}`
              )}
            </p>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center lg:flex">
          {isDemoMode && (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/50 px-4 py-1.5 text-xs font-semibold text-amber-700 backdrop-blur-sm">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>调试预览模式</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <button
            onClick={async () => {
              const savedDraftId = await saveRemoteDraft();
              if (savedDraftId && savedDraftId !== draftId) {
                navigate(`/editor?draftId=${encodeURIComponent(savedDraftId)}`, { replace: true });
              }
            }}
            className={cn(
              "hidden items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all sm:inline-flex",
              dirty 
                ? "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50" 
                : "bg-transparent text-slate-400 cursor-default"
            )}
            disabled={saving || !dirty}
          >
            <Save className="h-4 w-4" />
            {saving ? '正在创建' : '创建草稿'}
          </button>
          
          <button
            onClick={() => void generateExportPreview()}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 hover:shadow-slate-900/20 active:scale-95"
          >
            <FileText className="h-4 w-4" />
            下载简历
          </button>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-[1600px] gap-6 px-4 pb-6 md:px-8 lg:gap-8 h-[calc(100vh-120px)] overflow-hidden">
        <aside className="w-[380px] shrink-0 h-full">
          <div className="flex h-full flex-col rounded-[32px] border border-white/80 bg-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-xl">
            {/* Custom Tabs */}
            <div className="p-4 pb-0">
              <div className="flex p-1 bg-slate-100/80 rounded-2xl">
                {[
                  { id: 'template', label: '模板', icon: LayoutTemplate },
                  { id: 'style', label: '视觉', icon: Palette },
                  { id: 'structure', label: '模块', icon: Settings2 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "relative flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all duration-200 rounded-xl",
                      activeTab === tab.id 
                        ? "text-slate-900" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="active-tab-bg"
                        className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <tab.icon className={cn("relative z-10 h-4 w-4", activeTab === tab.id ? "text-blue-600" : "")} />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'template' && (
                  <motion.div
                    key="template"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900">选择简历模板</h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{RESUME_EDITOR_TEMPLATES.length} 款可用</span>
                    </div>
                    <div className="grid gap-3">
                      {RESUME_EDITOR_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setTemplate(template.id)}
                          className={cn(
                            'group relative overflow-hidden rounded-[20px] border-2 p-4 text-left transition-all duration-300',
                            draft.templateId === template.id
                              ? 'border-blue-600 bg-blue-50/50 shadow-md'
                              : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-slate-900">{template.name}</div>
                            {draft.templateId === template.id && (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                                <Save className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <p className={cn(
                            'mt-1 text-xs leading-relaxed transition-colors',
                            draft.templateId === template.id ? 'text-blue-700/70' : 'text-slate-500'
                          )}>
                            {template.description}
                          </p>
                          {draft.templateId !== template.id && (
                            <div className="absolute bottom-4 right-4 translate-x-4 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'style' && (
                  <motion.div
                    key="style"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    <div>
                      <div className="mb-4">
                        <h3 className="text-base font-bold text-slate-900">视觉主色</h3>
                        <p className="mt-1 text-xs text-slate-500">应用于标题、图标及强调性文字</p>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {ACCENT_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setAccentColor(preset)}
                            className={cn(
                              'group relative h-10 w-10 rounded-full transition-all duration-300 hover:scale-110 active:scale-90',
                              draft.appearance.accentColor === preset 
                                ? 'ring-2 ring-slate-900 ring-offset-4 scale-105 shadow-lg shadow-slate-200' 
                                : 'ring-1 ring-slate-200'
                            )}
                            style={{ backgroundColor: preset }}
                          >
                            {draft.appearance.accentColor === preset && (
                              <div className="absolute inset-0 flex items-center justify-center text-white">
                                <Save className="h-4 w-4" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <OptionGroupModern
                        title="全局字号"
                        options={[
                          { value: 'sm', label: '精细 (SM)' },
                          { value: 'md', label: '标准 (MD)' },
                          { value: 'lg', label: '清晰 (LG)' },
                        ]}
                        currentValue={draft.appearance.fontScale}
                        onChange={(value) => setFontScale(value as any)}
                      />
                      <OptionGroupModern
                        title="页边间距"
                        options={[
                          { value: 'compact', label: '紧凑' },
                          { value: 'standard', label: '标准' },
                          { value: 'relaxed', label: '舒适' },
                        ]}
                        currentValue={draft.appearance.pageSpacing}
                        onChange={(value) => setPageSpacing(value as any)}
                      />
                      <OptionGroupModern
                        title="文本行距"
                        options={[
                          { value: 'tight', label: '紧凑' },
                          { value: 'normal', label: '标准' },
                          { value: 'relaxed', label: '宽松' },
                        ]}
                        currentValue={draft.appearance.lineHeight}
                        onChange={(value) => setLineHeight(value as any)}
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'structure' && (
                  <motion.div
                    key="structure"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">模块管理</h3>
                        <p className="mt-1 text-xs text-slate-500">点击编辑内容，拖拽调整顺序</p>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('确认重置所有模块排序和显隐状态吗？内容不会丢失。')) {
                            reset();
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        title="重置编排"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-2.5">
                      {draft.modules.map((module, index) => {
                        const isVisible = !draft.hiddenModules[module];
                        const isActive = activeModule === module;

                        return (
                          <div
                            key={module}
                            className={cn(
                              'group relative overflow-hidden rounded-2xl border transition-all duration-300',
                              isActive 
                                ? 'border-slate-900 bg-slate-900 text-white shadow-lg' 
                                : isVisible
                                  ? 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                                  : 'border-dashed border-slate-200 bg-slate-50/50 opacity-70'
                            )}
                          >
                            <div className="flex items-center justify-between p-3.5">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs",
                                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                )}>
                                  {index + 1}
                                </div>
                                <span className="font-bold text-sm">{RESUME_EDITOR_MODULE_LABELS[module]}</span>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => toggleModule(module)}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    isActive 
                                      ? "text-white/60 hover:text-white hover:bg-white/10" 
                                      : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                  )}
                                  title={isVisible ? "隐藏模块" : "显示模块"}
                                >
                                  {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => setActiveModule(module)}
                                  className={cn(
                                    "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-all",
                                    isActive
                                      ? "bg-white text-slate-900"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  )}
                                >
                                  <PenSquare className="h-3.5 w-3.5" />
                                  编辑
                                </button>
                              </div>
                            </div>
                            
                            <div className={cn(
                              "flex border-t px-2 py-1.5 gap-1",
                              isActive ? "border-white/10" : "border-slate-50"
                            )}>
                              <button
                                onClick={() => moveModule(module, 'up')}
                                disabled={index === 0}
                                className={cn(
                                  "flex-1 py-1 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all",
                                  isActive 
                                    ? "hover:bg-white/10 text-white/60 hover:text-white" 
                                    : "hover:bg-slate-100 text-slate-400 hover:text-slate-600",
                                  "disabled:opacity-20"
                                )}
                              >
                                <ArrowUp className="h-3 w-3" />
                                上移
                              </button>
                              <div className={cn("w-[1px] h-3 self-center", isActive ? "bg-white/10" : "bg-slate-100")} />
                              <button
                                onClick={() => moveModule(module, 'down')}
                                disabled={index === draft.modules.length - 1}
                                className={cn(
                                  "flex-1 py-1 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all",
                                  isActive 
                                    ? "hover:bg-white/10 text-white/60 hover:text-white" 
                                    : "hover:bg-slate-100 text-slate-400 hover:text-slate-600",
                                  "disabled:opacity-20"
                                )}
                              >
                                <ArrowDown className="h-3 w-3" />
                                下移
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="p-6 border-t border-slate-100">
              <div className="rounded-2xl bg-blue-50/50 p-4 border border-blue-100">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1.5">编辑器提示</p>
                <p className="text-xs text-blue-700/80 leading-relaxed">
                  在右侧简历中直接点击任意内容区域可快速进入编辑模式。
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 min-w-0 h-full relative overflow-hidden rounded-[32px] border border-white/80 bg-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-xl">
          {saveError && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-6 left-6 right-6 z-30 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm flex items-center gap-3"
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              {saveError}
            </motion.div>
          )}

          {/* Zoom Controls - Integrated into the workbench area */}
          <div className="absolute bottom-8 right-8 z-30 flex items-center gap-1.5 rounded-[22px] border border-white/80 bg-white/70 p-1.5 shadow-2xl shadow-slate-200/40 backdrop-blur-xl ring-1 ring-slate-950/5">
            <button
              onClick={handleZoomOut}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90"
              title="缩小"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="px-1 min-w-[56px] text-center select-none">
              <span className="text-[11px] font-bold tabular-nums text-slate-600">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <button
              onClick={handleZoomIn}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90"
              title="放大"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="mx-1 h-4 w-px bg-slate-200" />
            <button
              onClick={handleResetZoom}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90"
              title="适应屏幕"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          
          <div 
            ref={scrollContainerRef}
            className="absolute inset-0 overflow-auto scroll-smooth custom-scrollbar"
          >
            <div 
              className={cn(
                "flex flex-col items-center pt-3 pb-32 px-8 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) min-h-full",
                activeModule && 'lg:pr-[440px]'
              )}
            >
              <div 
                className="relative transition-transform duration-300 ease-out origin-top"
                style={{ 
                  transform: `scale(${zoom})`, 
                  width: '840px', 
                  marginBottom: `calc(1160px * (${zoom} - 1) + 60px)` 
                }}
              >
                <div className="relative group rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_30px_90px_rgba(0,0,0,0.08),0_15px_30px_rgba(0,0,0,0.04)] bg-white ring-1 ring-slate-950/5">
                  <ResumeCanvas
                    ref={canvasRef}
                    draft={draft}
                    activeModule={activeModule}
                    hoveredModule={hoveredModule}
                    onModuleHover={setHoveredModule}
                    onModuleSelect={setActiveModule}
                    onModuleReorder={reorderModule}
                  />
                  
                  {/* Subtle Page Edge Overlay */}
                  <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-slate-950/[0.03] rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

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

function OptionGroupModern({
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
    <div>
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{title}</h4>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border py-2.5 transition-all duration-200',
              currentValue === option.value
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
                : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
            )}
          >
            <span className="text-xs">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
