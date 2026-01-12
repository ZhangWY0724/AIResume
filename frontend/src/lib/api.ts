import axios from 'axios';

// 配置 axios 实例
const api = axios.create({
  baseURL: '/api', // 开发环境下由 Vite 代理转发，生产环境需配置实际地址
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // AI 响应可能较慢，设置 60s 超时
});

// 响应拦截器：统一处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 这里可以添加全局错误提示逻辑
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// --- DTO Interfaces ---

export interface DimensionScore {
  name: string;
  score: number;
  comment: string;
}

export interface AnalyzeRequest {
  content: string;
  industryId: string;
}

export interface AnalyzeResponse {
  score: number;
  level: string;
  dimensions: DimensionScore[];
  comment: string;
  strengths: string[];
  improvements: string[];
  atsScore: number;
  missingKeywords: string[];
}

export interface PolishRequest {
  content: string;
  industryId: string;
  targetPosition?: string;
}

export interface PolishChange {
  original: string;
  polished: string;
  reason: string;
}

export interface PolishResponse {
  polishedContent: string;
  changes: PolishChange[];
  summary: string;
}

export interface ImportResponse {
  success: boolean;
  content: string;
  fileName: string;
  fileType: string;
  errorMessage?: string;
}

export interface MatchRequest {
  resumeContent: string;
  jobDescription: string;
  industryId?: string;
}

export interface KeywordMatch {
  keyword: string;
  isMatched: boolean;
  importance: string;
}

export interface MatchResponse {
  matchScore: number;
  matchLevel: string;
  summary: string;
  matchedKeywords: KeywordMatch[];
  missingKeywords: string[];
  suggestions: string[];
}

export interface InterviewRequest {
  resumeContent: string;
  targetPosition?: string;
  industryId?: string;
}

export interface InterviewQuestion {
  category: string;
  question: string;
  reason: string;
  tips: string;
  difficulty: string;
}

export interface InterviewResponse {
  questions: InterviewQuestion[];
  preparationTips: string;
}

// --- API Functions ---

export const resumeApi = {
  /**
   * 上传简历文件并解析
   */
  uploadFile: async (file: File): Promise<ImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ImportResponse>('/Resume/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * 简历智能分析
   */
  analyze: async (data: AnalyzeRequest): Promise<AnalyzeResponse> => {
    const response = await api.post<AnalyzeResponse>('/Resume/analyze', data);
    return response.data;
  },

  /**
   * 简历润色
   */
  polish: async (data: PolishRequest): Promise<PolishResponse> => {
    const response = await api.post<PolishResponse>('/Resume/polish', data);
    return response.data;
  },

  /**
   * 职位匹配 (JD Match)
   */
  matchJob: async (data: MatchRequest): Promise<MatchResponse> => {
    const response = await api.post<MatchResponse>('/Resume/match', data);
    return response.data;
  },

  /**
   * 面试预测
   */
  predictInterview: async (data: InterviewRequest): Promise<InterviewResponse> => {
    const response = await api.post<InterviewResponse>('/Resume/interview', data);
    return response.data;
  }
};
