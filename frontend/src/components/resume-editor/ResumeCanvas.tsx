import { GripVertical, Mail, MapPin, Phone } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { RESUME_EDITOR_MODULE_LABELS } from '@/lib/resume-editor/templates';
import { cn } from '@/lib/utils';
import type { ResumeEditorDraft, ResumeEditorModuleKey } from '@/lib/resume-editor/types';

type ResumeCanvasProps = {
  draft: ResumeEditorDraft;
  activeModule: ResumeEditorModuleKey | null;
  hoveredModule: ResumeEditorModuleKey | null;
  onModuleHover: (module: ResumeEditorModuleKey | null) => void;
  onModuleSelect: (module: ResumeEditorModuleKey) => void;
  onModuleReorder: (module: ResumeEditorModuleKey, targetModule: ResumeEditorModuleKey) => void;
};

type ModuleDropScope = 'classic-sidebar' | 'classic-main' | 'compact';

type RenderContext = Pick<ResumeCanvasProps, 'activeModule' | 'hoveredModule' | 'onModuleHover' | 'onModuleSelect' | 'onModuleReorder'> & {
  draggingModule: ResumeEditorModuleKey | null;
  dragOverModule: ResumeEditorModuleKey | null;
  setDraggingModule: (module: ResumeEditorModuleKey | null) => void;
  setDragOverModule: (module: ResumeEditorModuleKey | null) => void;
};
type ModuleRenderer = (draft: ResumeEditorDraft, context: RenderContext) => JSX.Element | null;

const CLASSIC_SIDEBAR_MODULES: ResumeEditorModuleKey[] = ['profile', 'skills', 'education'];
const CLASSIC_MAIN_MODULES: ResumeEditorModuleKey[] = ['summary', 'experience', 'projects'];

function shouldRender(draft: ResumeEditorDraft, module: ResumeEditorModuleKey): boolean {
  return !draft.hiddenModules[module];
}

function getOrderedModules(draft: ResumeEditorDraft, scope?: ResumeEditorModuleKey[]): ResumeEditorModuleKey[] {
  const source = scope ?? draft.modules;
  return draft.modules.filter((module) => source.includes(module) && shouldRender(draft, module));
}

function getContainerClass(draft: ResumeEditorDraft): string {
  const classes = [
    'resume-editor-canvas',
    'mx-auto',
    'min-h-[1160px]',
    'w-full',
    'border',
    'border-slate-200',
    'bg-white',
    'shadow-[0_24px_90px_rgba(15,23,42,0.12)]',
  ];

  classes.push(draft.templateId === 'classic' ? 'rounded-[32px]' : 'rounded-[28px]');
  classes.push(draft.appearance.fontScale === 'sm' ? 'text-[14px]' : draft.appearance.fontScale === 'lg' ? 'text-[16px]' : 'text-[15px]');
  classes.push(draft.appearance.pageSpacing === 'compact' ? 'max-w-[860px]' : draft.appearance.pageSpacing === 'relaxed' ? 'max-w-[960px]' : 'max-w-[900px]');
  classes.push(draft.templateId === 'classic' ? 'grid md:grid-cols-[280px_1fr]' : 'block');

  return classes.join(' ');
}

function getPaddingClass(pageSpacing: ResumeEditorDraft['appearance']['pageSpacing']): string {
  if (pageSpacing === 'compact') {
    return 'px-7 py-8';
  }

  if (pageSpacing === 'relaxed') {
    return 'px-10 py-11';
  }

  return 'px-8 py-10';
}

function getSectionSpacingClass(lineHeight: ResumeEditorDraft['appearance']['lineHeight']): string {
  if (lineHeight === 'tight') {
    return 'space-y-6';
  }

  if (lineHeight === 'relaxed') {
    return 'space-y-10';
  }

  return 'space-y-8';
}

function getBodyTextClass(lineHeight: ResumeEditorDraft['appearance']['lineHeight']): string {
  if (lineHeight === 'tight') {
    return 'leading-6';
  }

  if (lineHeight === 'relaxed') {
    return 'leading-8';
  }

  return 'leading-7';
}

function sectionTitle(title: string, accentColor: string) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
      <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</h3>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function formatEducationLine(item: ResumeEditorDraft['document']['education'][number]): string {
  return [item.school, item.degree, item.major].filter(Boolean).join(' / ');
}

function getModuleScope(templateId: ResumeEditorDraft['templateId'], module: ResumeEditorModuleKey): ModuleDropScope {
  if (templateId === 'compact') {
    return 'compact';
  }

  return CLASSIC_SIDEBAR_MODULES.includes(module) ? 'classic-sidebar' : 'classic-main';
}

function InteractiveBlock({
  draft,
  module,
  context,
  className,
  children,
}: {
  draft: ResumeEditorDraft;
  module: ResumeEditorModuleKey;
  context: RenderContext;
  className?: string;
  children: JSX.Element;
}) {
  const isActive = context.activeModule === module;
  const isHovered = context.hoveredModule === module;
  const isDragging = context.draggingModule === module;
  const isClassicSidebar = draft.templateId === 'classic' && getModuleScope(draft.templateId, module) === 'classic-sidebar';
  const isSameScope = !context.draggingModule
    || getModuleScope(draft.templateId, context.draggingModule) === getModuleScope(draft.templateId, module);
  const isDragOver = context.dragOverModule === module && context.draggingModule !== module && isSameScope;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`编辑${RESUME_EDITOR_MODULE_LABELS[module]}`}
      draggable
      onMouseEnter={() => context.onModuleHover(module)}
      onMouseLeave={() => context.onModuleHover(null)}
      onClick={() => context.onModuleSelect(module)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          context.onModuleSelect(module);
        }
      }}
      onDragStart={(event) => {
        context.setDraggingModule(module);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', module);
      }}
      onDragOver={(event) => {
        const draggingModule = (event.dataTransfer.getData('text/plain') as ResumeEditorModuleKey) || context.draggingModule;
        if (!draggingModule) {
          return;
        }

        if (getModuleScope(draft.templateId, draggingModule) !== getModuleScope(draft.templateId, module)) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        context.setDragOverModule(module);
      }}
      onDragLeave={() => {
        if (context.dragOverModule === module) {
          context.setDragOverModule(null);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        const draggingModule = (event.dataTransfer.getData('text/plain') as ResumeEditorModuleKey) || context.draggingModule;
        if (!draggingModule || getModuleScope(draft.templateId, draggingModule) !== getModuleScope(draft.templateId, module)) {
          context.setDraggingModule(null);
          context.setDragOverModule(null);
          return;
        }

        context.onModuleReorder(draggingModule, module);
        context.setDraggingModule(null);
        context.setDragOverModule(null);
      }}
      onDragEnd={() => {
        context.setDraggingModule(null);
        context.setDragOverModule(null);
      }}
      className={cn(
        'group relative block w-full rounded-[22px] text-left transition outline-none',
        isDragging && 'opacity-50',
        isClassicSidebar ? 'focus-visible:ring-2 focus-visible:ring-slate-900/20' : 'focus-visible:ring-2 focus-visible:ring-slate-900/20',
        className,
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[22px] border transition',
          isClassicSidebar
            ? isActive
              ? 'border-slate-300 bg-white/80 shadow-[0_0_0_3px_rgba(148,163,184,0.12)]'
              : isDragOver
                ? 'border-dashed border-sky-400 bg-sky-50/90'
                : isHovered
                  ? 'border-slate-200 bg-white/65'
                  : 'border-transparent'
            : isActive
              ? 'border-slate-300 bg-slate-50/90 shadow-[0_0_0_3px_rgba(148,163,184,0.12)]'
              : isDragOver
                ? 'border-dashed border-sky-400 bg-sky-50/90'
                : isHovered
                  ? 'border-slate-200 bg-slate-50/65'
                  : 'border-transparent',
        )}
      />
      <span
        className={cn(
          'resume-editor-interactive-label pointer-events-none absolute left-4 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition',
          'bg-white text-slate-500 shadow-sm',
          isActive || isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        {RESUME_EDITOR_MODULE_LABELS[module]}
      </span>
      <span
        className={cn(
          'resume-editor-interactive-label pointer-events-none absolute right-4 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
          'bg-white text-slate-500 shadow-sm',
          isActive || isHovered || isDragOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <GripVertical className="h-3.5 w-3.5" />
        拖动排序
      </span>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

const MODULE_RENDERERS: Record<Exclude<ResumeEditorModuleKey, 'profile'>, ModuleRenderer> = {
  summary: (draft, context) => {
    const { document, appearance } = draft;
    return (
      <InteractiveBlock draft={draft} module="summary" context={context}>
        <section className="px-4 pb-4 pt-11">
          {sectionTitle('个人简介', appearance.accentColor)}
          <p className={cn('text-slate-600', getBodyTextClass(appearance.lineHeight))}>{document.summary || '请补充个人简介。'}</p>
        </section>
      </InteractiveBlock>
    );
  },
  experience: (draft, context) => {
    const { document, appearance } = draft;
    return (
      <InteractiveBlock draft={draft} module="experience" context={context}>
        <section className="px-4 pb-4 pt-11">
          {sectionTitle('工作经历', appearance.accentColor)}
          <div className="space-y-5">
            {document.experience.length > 0 ? document.experience.map((item) => (
              <article key={item.id}>
                <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">{item.role}</h4>
                    <p className="text-sm text-slate-500">{item.company}</p>
                  </div>
                  <span className="text-sm text-slate-400">{item.period}</span>
                </div>
                <ul className={cn('mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600', getBodyTextClass(appearance.lineHeight))}>
                  {item.bullets.map((bullet, index) => <li key={`${item.id}-${index}`}>{bullet}</li>)}
                </ul>
              </article>
            )) : (
              <p className="text-sm text-slate-500">暂未识别工作经历，请补充内容。</p>
            )}
          </div>
        </section>
      </InteractiveBlock>
    );
  },
  projects: (draft, context) => {
    const { document, appearance } = draft;
    return (
      <InteractiveBlock draft={draft} module="projects" context={context}>
        <section className="px-4 pb-4 pt-11">
          {sectionTitle('项目经历', appearance.accentColor)}
          <div className="space-y-5">
            {document.projects.length > 0 ? document.projects.map((item) => (
              <article key={item.id}>
                <h4 className="font-semibold text-slate-900">{item.name}</h4>
                <p className="mt-1 text-sm text-slate-500">{item.role}</p>
                <ul className={cn('mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600', getBodyTextClass(appearance.lineHeight))}>
                  {item.bullets.map((bullet, index) => <li key={`${item.id}-${index}`}>{bullet}</li>)}
                </ul>
              </article>
            )) : (
              <p className="text-sm text-slate-500">暂未识别项目经历，请补充内容。</p>
            )}
          </div>
        </section>
      </InteractiveBlock>
    );
  },
  education: (draft, context) => {
    const { document, appearance } = draft;
    return (
      <InteractiveBlock draft={draft} module="education" context={context}>
        <section className="px-4 pb-4 pt-11">
          {sectionTitle('教育经历', appearance.accentColor)}
          <div className="space-y-4">
            {document.education.length > 0 ? document.education.map((item) => (
              <article key={item.id} className="flex items-start justify-between gap-4">
                <h4 className={cn(
                  'min-w-0 flex-1 font-semibold',
                  'text-slate-900',
                )}>
                  {formatEducationLine(item) || '学校 / 学历 / 专业待补充'}
                </h4>
                <p className={cn(
                  'shrink-0 text-xs',
                  'text-slate-500',
                  appearance.lineHeight === 'relaxed' ? 'leading-6' : 'leading-5',
                )}>
                  {item.period || '时间待补充'}
                </p>
              </article>
            )) : (
              <p className="text-sm text-slate-500">暂未识别教育经历，请补充内容。</p>
            )}
          </div>
        </section>
      </InteractiveBlock>
    );
  },
  skills: (draft, context) => {
    const { document, appearance, templateId } = draft;
    const badgeClassName = templateId === 'classic'
      ? 'rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs text-slate-700'
      : 'rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600';

    return (
      <InteractiveBlock draft={draft} module="skills" context={context}>
        <section className="px-4 pb-4 pt-11">
          {sectionTitle('技能标签', appearance.accentColor)}
          <div className="flex flex-wrap gap-2">
            {document.skills.length > 0 ? document.skills.map((skill) => (
              <span key={skill} className={badgeClassName}>
                {skill}
              </span>
            )) : (
              <p className="text-sm text-slate-400">从原始简历识别到的技能会显示在这里。</p>
            )}
          </div>
        </section>
      </InteractiveBlock>
    );
  },
};

function renderModules(draft: ResumeEditorDraft, modules: ResumeEditorModuleKey[], context: RenderContext): JSX.Element[] {
  return modules
    .filter((module): module is Exclude<ResumeEditorModuleKey, 'profile'> => module !== 'profile')
    .map((module) => MODULE_RENDERERS[module](draft, context))
    .filter(Boolean) as JSX.Element[];
}

export const ResumeCanvas = forwardRef<HTMLDivElement, ResumeCanvasProps>(function ResumeCanvas({
  draft,
  activeModule,
  hoveredModule,
  onModuleHover,
  onModuleSelect,
  onModuleReorder,
}, ref) {
  const [draggingModule, setDraggingModule] = useState<ResumeEditorModuleKey | null>(null);
  const [dragOverModule, setDragOverModule] = useState<ResumeEditorModuleKey | null>(null);
  const { document, appearance } = draft;
  const paddingClassName = getPaddingClass(appearance.pageSpacing);
  const context: RenderContext = {
    activeModule,
    hoveredModule,
    onModuleHover,
    onModuleSelect,
    onModuleReorder,
    draggingModule,
    dragOverModule,
    setDraggingModule,
    setDragOverModule,
  };
  const classicSidebarModules = getOrderedModules(draft, CLASSIC_SIDEBAR_MODULES);
  const classicMainModules = getOrderedModules(draft, CLASSIC_MAIN_MODULES);
  const compactModules = getOrderedModules(draft);

  return (
    <div className="mx-auto w-full">
      <div ref={ref} className={getContainerClass(draft)}>
        {draft.templateId === 'classic' ? (
          <>
            <aside className={cn('rounded-l-[32px] bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_100%)] text-slate-800', paddingClassName)}>
              <div className={cn(getSectionSpacingClass(appearance.lineHeight), 'h-full')}>
                {classicSidebarModules.map((module) => (
                  module === 'profile' ? (
                    <InteractiveBlock key={module} draft={draft} module="profile" context={context} className="rounded-[26px]">
                      <section className="px-4 pb-4 pt-11">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Profile</p>
                        <h1 className="mt-3 text-3xl font-bold leading-tight">{document.profile.name || '未命名候选人'}</h1>
                        <p className="mt-2 text-base text-slate-600">{document.profile.title || '目标岗位待补充'}</p>
                        <div className="mt-6 space-y-3 text-sm text-slate-600">
                          {document.profile.phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4" />
                              <span>{document.profile.phone}</span>
                            </div>
                          )}
                          {document.profile.email && (
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4" />
                              <span>{document.profile.email}</span>
                            </div>
                          )}
                          {document.profile.location && (
                            <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4" />
                              <span>{document.profile.location}</span>
                            </div>
                          )}
                        </div>
                      </section>
                    </InteractiveBlock>
                  ) : (
                    <div key={module}>{renderModules(draft, [module], context)}</div>
                  )
                ))}
              </div>
            </aside>

            <main className={paddingClassName}>
              <div className={cn(getSectionSpacingClass(appearance.lineHeight), 'text-slate-700')}>
                {renderModules(draft, classicMainModules, context)}
              </div>
            </main>
          </>
        ) : (
          <div className={paddingClassName}>
            <main className={cn(shouldRender(draft, 'profile') && 'pt-8', getSectionSpacingClass(appearance.lineHeight), 'text-slate-700')}>
              {compactModules.map((module) => (
                module === 'profile' ? (
                  <InteractiveBlock key={module} draft={draft} module="profile" context={context} className="rounded-[26px]">
                    <header className="border-b border-slate-200 px-4 pb-6 pt-11">
                      <h1 className="text-4xl font-bold text-slate-950">{document.profile.name || '未命名候选人'}</h1>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                        {document.profile.title && <span>{document.profile.title}</span>}
                        {document.profile.phone && <span>{document.profile.phone}</span>}
                        {document.profile.email && <span>{document.profile.email}</span>}
                        {document.profile.location && <span>{document.profile.location}</span>}
                      </div>
                    </header>
                  </InteractiveBlock>
                ) : (
                  <div key={module}>{renderModules(draft, [module], context)}</div>
                )
              ))}
            </main>
          </div>
        )}
      </div>
    </div>
  );
});
