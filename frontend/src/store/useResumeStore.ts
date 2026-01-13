import { create } from 'zustand';
import { AnalyzeResponse, InterviewResponse } from '@/lib/api';

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

  // 分析结果缓存
  analysisResult: AnalyzeResponse | null;
  interviewResult: InterviewResponse | null; // 面试预测缓存
  analysisContentHash: string | null; // 用于判断简历内容是否变化
  setAnalysisResult: (result: AnalyzeResponse | null, contentHash?: string) => void;
  setInterviewResult: (result: InterviewResponse | null) => void;
  clearAnalysisCache: () => void;
}

// 简单的内容哈希函数，用于判断简历内容是否变化
const hashContent = (content: string, industryId: string | null): string => {
  return `${industryId}:${content.length}:${content.substring(0, 100)}`;
};

export const useResumeStore = create<ResumeState>((set) => ({
  selectedIndustry: null,
  setSelectedIndustry: (industryId) => set({ selectedIndustry: industryId }),

  resumeContent: '',
  setResumeContent: (content) => set({ resumeContent: content }),

  uploadedFile: null,
  setUploadedFile: (file) => set({ uploadedFile: file }),

  currentStep: 'industry',
  setStep: (step) => set({ currentStep: step }),

  // 分析结果缓存
  analysisResult: null,
  interviewResult: null,
  analysisContentHash: null,
  setAnalysisResult: (result, contentHash) => set({
    analysisResult: result,
    analysisContentHash: contentHash ?? null
  }),
  setInterviewResult: (result) => set({ interviewResult: result }),
  clearAnalysisCache: () => set({ analysisResult: null, interviewResult: null, analysisContentHash: null }),
}));

// 导出哈希函数供外部使用
export { hashContent };