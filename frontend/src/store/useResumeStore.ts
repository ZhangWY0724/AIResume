import { create } from 'zustand';

interface ResumeState {
  // 行业选择
  selectedIndustry: string | null;
  setSelectedIndustry: (industryId: string) => void;

  // 简历内容
  resumeContent: string;
  setResumeContent: (content: string) => void;

  // 上传的文件信息 (用于展示)
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  
  // 步骤控制
  currentStep: 'industry' | 'upload' | 'analysis' | 'result';
  setStep: (step: 'industry' | 'upload' | 'analysis' | 'result') => void;
}

export const useResumeStore = create<ResumeState>((set) => ({
  selectedIndustry: null,
  setSelectedIndustry: (industryId) => set({ selectedIndustry: industryId }),

  resumeContent: '',
  setResumeContent: (content) => set({ resumeContent: content }),

  uploadedFile: null,
  setUploadedFile: (file) => set({ uploadedFile: file }),

  currentStep: 'industry',
  setStep: (step) => set({ currentStep: step }),
}));