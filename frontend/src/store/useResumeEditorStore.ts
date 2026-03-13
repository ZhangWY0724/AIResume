import { create } from 'zustand';
import { createDraftFromResumeText } from '@/lib/resume-editor/mappers';
import type {
  ResumeEditorDraft,
  ResumeEditorEducationItem,
  ResumeEditorExperienceItem,
  ResumeEditorModuleKey,
  ResumeEditorProjectItem,
  ResumeEditorTemplateId,
} from '@/lib/resume-editor/types';
import { resumeApi } from '@/lib/api';

const STORAGE_KEY = 'resume-editor-draft-v1';

type ResumeEditorState = {
  draftId: string | null;
  draft: ResumeEditorDraft | null;
  initialized: boolean;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
  initialize: (sourceText: string) => void;
  hydrate: (draftId: string) => Promise<void>;
  createRemoteDraft: (rawText: string, polishedText?: string) => Promise<string | null>;
  saveRemoteDraft: () => Promise<string | null>;
  reset: () => void;
  setTemplate: (templateId: ResumeEditorTemplateId) => void;
  setAccentColor: (color: string) => void;
  setFontScale: (fontScale: ResumeEditorDraft['appearance']['fontScale']) => void;
  setPageSpacing: (pageSpacing: ResumeEditorDraft['appearance']['pageSpacing']) => void;
  setLineHeight: (lineHeight: ResumeEditorDraft['appearance']['lineHeight']) => void;
  updateProfileField: (field: keyof ResumeEditorDraft['document']['profile'], value: string) => void;
  updateSummary: (summary: string) => void;
  updateSkills: (skills: string[]) => void;
  addExperience: () => void;
  updateExperience: (id: string, field: keyof ResumeEditorExperienceItem, value: string | string[]) => void;
  removeExperience: (id: string) => void;
  addProject: () => void;
  updateProject: (id: string, field: keyof ResumeEditorProjectItem, value: string | string[]) => void;
  removeProject: (id: string) => void;
  addEducation: () => void;
  updateEducation: (id: string, field: keyof ResumeEditorEducationItem, value: string) => void;
  removeEducation: (id: string) => void;
  toggleModule: (module: ResumeEditorModuleKey) => void;
  moveModule: (module: ResumeEditorModuleKey, direction: 'up' | 'down') => void;
  reorderModule: (module: ResumeEditorModuleKey, targetModule: ResumeEditorModuleKey) => void;
};

function persistDraft(draft: ResumeEditorDraft | null): void {
  if (!draft) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function readDraft(): ResumeEditorDraft | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ResumeEditorDraft;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export const useResumeEditorStore = create<ResumeEditorState>((set, get) => ({
  draftId: null,
  draft: null,
  initialized: false,
  dirty: false,
  saving: false,
  loading: false,
  saveError: null,
  lastSavedAt: null,
  initialize: (sourceText) => {
    if (get().initialized) {
      return;
    }

    const saved = readDraft();
    const nextDraft = saved && saved.document.sourceText.trim() === sourceText.trim()
      ? saved
      : createDraftFromResumeText(sourceText);

    set({ draft: nextDraft, initialized: true, draftId: null, saveError: null, dirty: false, lastSavedAt: null });
    persistDraft(nextDraft);
  },
  hydrate: async (draftId) => {
    set({ loading: true, saveError: null });
    try {
      const response = await resumeApi.getEditorDraft(draftId);
      set({
        draftId: response.draftId,
        draft: response.draft,
        initialized: true,
        loading: false,
        dirty: false,
        lastSavedAt: response.updatedAt,
      });
      persistDraft(response.draft);
    } catch (error: any) {
      set({
        loading: false,
        saveError: error?.response?.data?.message || error?.message || '加载草稿失败',
      });
      throw error;
    }
  },
  createRemoteDraft: async (rawText, polishedText) => {
    set({ saving: true, saveError: null });
    try {
      const draft = await resumeApi.structureEditorDraft({ rawText, polishedText });
      const response = await resumeApi.createEditorDraft(draft);
      set({
        draftId: response.draftId,
        draft: response.draft,
        initialized: true,
        saving: false,
        dirty: false,
        lastSavedAt: response.updatedAt,
      });
      persistDraft(response.draft);
      return response.draftId;
    } catch (error: any) {
      set({
        saving: false,
        saveError: error?.response?.data?.message || error?.message || '创建草稿失败',
      });
      return null;
    }
  },
  saveRemoteDraft: async () => {
    const { draft, draftId } = get();
    if (!draft) return null;

    set({ saving: true, saveError: null });
    try {
      if (!draftId) {
        const response = await resumeApi.createEditorDraft(draft);
        set({ draftId: response.draftId, draft: response.draft, saving: false, dirty: false, lastSavedAt: response.updatedAt });
        persistDraft(response.draft);
        return response.draftId;
      }

      const response = await resumeApi.updateEditorDraft(draftId, draft);
      set({ draft: response.draft, saving: false, dirty: false, lastSavedAt: response.updatedAt });
      persistDraft(response.draft);
      return response.draftId;
    } catch (error: any) {
      set({
        saving: false,
        saveError: error?.response?.data?.message || error?.message || '保存草稿失败',
      });
      return null;
    }
  },
  reset: () => {
    set({ draftId: null, draft: null, initialized: false, saveError: null, dirty: false, lastSavedAt: null });
    persistDraft(null);
  },
  setPageSpacing: (pageSpacing) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      appearance: {
        ...draft.appearance,
        pageSpacing,
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  setLineHeight: (lineHeight) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      appearance: {
        ...draft.appearance,
        lineHeight,
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  setTemplate: (templateId) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = { ...draft, templateId };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  setAccentColor: (accentColor) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      appearance: {
        ...draft.appearance,
        accentColor,
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  setFontScale: (fontScale) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      appearance: {
        ...draft.appearance,
        fontScale,
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  updateProfileField: (field, value) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        profile: {
          ...draft.document.profile,
          [field]: value,
        },
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  updateSummary: (summary) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        summary,
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  updateSkills: (skills) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        skills,
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  addExperience: () => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        experience: [
          ...draft.document.experience,
          {
            id: `exp-${Date.now()}`,
            company: '',
            role: '',
            period: '',
            bullets: [''],
          },
        ],
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  updateExperience: (id, field, value) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        experience: draft.document.experience.map((item) =>
          item.id === id ? { ...item, [field]: value } : item),
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  removeExperience: (id) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        experience: draft.document.experience.filter((item) => item.id !== id),
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  addProject: () => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        projects: [
          ...draft.document.projects,
          {
            id: `project-${Date.now()}`,
            name: '',
            role: '',
            bullets: [''],
          },
        ],
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  updateProject: (id, field, value) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        projects: draft.document.projects.map((item) =>
          item.id === id ? { ...item, [field]: value } : item),
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  removeProject: (id) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        projects: draft.document.projects.filter((item) => item.id !== id),
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  addEducation: () => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        education: [
          ...draft.document.education,
          {
            id: `edu-${Date.now()}`,
            school: '',
            degree: '',
            major: '',
            period: '',
          },
        ],
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  updateEducation: (id, field, value) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        education: draft.document.education.map((item) =>
          item.id === id ? { ...item, [field]: value } : item),
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  removeEducation: (id) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      document: {
        ...draft.document,
        education: draft.document.education.filter((item) => item.id !== id),
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  toggleModule: (module) => {
    const draft = get().draft;
    if (!draft) return;
    const nextDraft = {
      ...draft,
      hiddenModules: {
        ...draft.hiddenModules,
        [module]: !draft.hiddenModules[module],
      },
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  moveModule: (module, direction) => {
    const draft = get().draft;
    if (!draft) return;

    const currentIndex = draft.modules.indexOf(module);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= draft.modules.length) {
      return;
    }

    const modules = [...draft.modules];
    const [currentModule] = modules.splice(currentIndex, 1);
    modules.splice(targetIndex, 0, currentModule);

    const nextDraft = {
      ...draft,
      modules,
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
  reorderModule: (module, targetModule) => {
    const draft = get().draft;
    if (!draft || module === targetModule) return;

    const currentIndex = draft.modules.indexOf(module);
    const targetIndex = draft.modules.indexOf(targetModule);
    if (currentIndex === -1 || targetIndex === -1) {
      return;
    }

    const modules = [...draft.modules];
    const [currentModule] = modules.splice(currentIndex, 1);
    modules.splice(targetIndex, 0, currentModule);

    const nextDraft = {
      ...draft,
      modules,
    };
    set({ draft: nextDraft, dirty: true });
    persistDraft(nextDraft);
  },
}));
