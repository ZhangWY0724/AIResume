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

// --- SSE Event Types ---

export interface SseProgressData {
  percentage: number;
  stage: string;
  message: string;
}

export interface SseErrorData {
  message: string;
  code?: string;
}

export type AnalyzeStreamCallback = {
  onProgress?: (data: SseProgressData) => void;
  onChunk?: (content: string) => void;
  onComplete?: (result: AnalyzeResponse) => void;
  onError?: (error: SseErrorData) => void;
};

export type PolishStreamCallback = {
  onProgress?: (data: SseProgressData) => void;
  onChunk?: (content: string) => void;
  onComplete?: (result: PolishResponse) => void;
  onError?: (error: SseErrorData) => void;
};

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
   * 简历智能分析（SSE 流式响应）
   * @param data 分析请求
   * @param callbacks 回调函数
   * @returns AbortController 用于取消请求
   */
  analyzeStream: (data: AnalyzeRequest, callbacks: AnalyzeStreamCallback): AbortController => {
    const controller = new AbortController();

    console.log('[API] analyzeStream 开始，请求数据:', data);

    (async () => {
      try {
        console.log('[API] 发起 fetch 请求...');
        const response = await fetch('/api/Resume/analyze-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        console.log('[API] fetch 响应状态:', response.status, response.ok);

        if (!response.ok) {
          const errorData = await response.json();
          callbacks.onError?.({ message: errorData.message || '请求失败', code: 'HTTP_ERROR' });
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          callbacks.onError?.({ message: '无法读取响应流', code: 'STREAM_ERROR' });
          return;
        }

        console.log('[API] 开始读取 SSE 流...');
        const decoder = new TextDecoder();
        
        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[API] SSE 流读取完成');
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // Split by double newline to separate event blocks if possible, 
          // but robust parsing processes line by line
          const lines = buffer.split(/\r?\n/);
          // Keep the last partial line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') {
              // Empty line triggers dispatch
              if (currentData) {
                try {
                   // Dispatch logic
                   const jsonStr = currentData;
                   console.log(`[API] Dispatching event: ${currentEvent || 'message'}`);
                   
                   const eventData = JSON.parse(jsonStr);
                   const type = currentEvent || 'message';

                   switch (type) {
                     case 'progress':
                       callbacks.onProgress?.(eventData as SseProgressData);
                       break;
                     case 'chunk':
                       callbacks.onChunk?.(eventData.content);
                       break;
                     case 'complete':
                       console.log('[API] 触发 onComplete 回调');
                       callbacks.onComplete?.(eventData as AnalyzeResponse);
                       break;
                     case 'error':
                       callbacks.onError?.(eventData as SseErrorData);
                       break;
                     default:
                       console.log('[API] Unhandled event type:', type);
                   }
                } catch (e) {
                   console.warn('解析 SSE 数据失败:', currentData, e);
                }
              }
              // Reset state for next event
              currentEvent = '';
              currentData = '';
              continue;
            }

            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              // SSE spec: if multiple data lines, join with newline
              const content = line.slice(5).trim();
              currentData += (currentData ? '\n' : '') + content;
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('SSE 请求已取消');
          return;
        }
        callbacks.onError?.({ message: error.message || '网络错误', code: 'NETWORK_ERROR' });
      }
    })();

    return controller;
  },

  /**
   * 简历润色
   */
  polish: async (data: PolishRequest): Promise<PolishResponse> => {
    const response = await api.post<PolishResponse>('/Resume/polish', data);
    return response.data;
  },

  /**
   * 简历润色（SSE 流式响应）
   * @param data 润色请求
   * @param callbacks 回调函数
   * @returns AbortController 用于取消请求
   */
  polishStream: (data: PolishRequest, callbacks: PolishStreamCallback): AbortController => {
    const controller = new AbortController();

    console.log('[API] polishStream 开始，请求数据:', data);

    (async () => {
      try {
        console.log('[API] 发起 polish-stream fetch 请求...');
        const response = await fetch('/api/Resume/polish-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        console.log('[API] polish-stream 响应状态:', response.status, response.ok);

        if (!response.ok) {
          const errorData = await response.json();
          callbacks.onError?.({ message: errorData.message || '请求失败', code: 'HTTP_ERROR' });
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          callbacks.onError?.({ message: '无法读取响应流', code: 'STREAM_ERROR' });
          return;
        }

        console.log('[API] 开始读取润色 SSE 流...');
        const decoder = new TextDecoder();

        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[API] 润色 SSE 流读取完成');
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') {
              if (currentData) {
                try {
                   const jsonStr = currentData;
                   console.log(`[API] Dispatching polish event: ${currentEvent || 'message'}`);

                   const eventData = JSON.parse(jsonStr);
                   const type = currentEvent || 'message';

                   switch (type) {
                     case 'progress':
                       callbacks.onProgress?.(eventData as SseProgressData);
                       break;
                     case 'chunk':
                       callbacks.onChunk?.(eventData.content);
                       break;
                     case 'complete':
                       console.log('[API] 触发润色 onComplete 回调');
                       callbacks.onComplete?.(eventData as PolishResponse);
                       break;
                     case 'error':
                       callbacks.onError?.(eventData as SseErrorData);
                       break;
                     default:
                       console.log('[API] Unhandled polish event type:', type);
                   }
                } catch (e) {
                   console.warn('解析润色 SSE 数据失败:', currentData, e);
                }
              }
              currentEvent = '';
              currentData = '';
              continue;
            }

            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              const content = line.slice(5).trim();
              currentData += (currentData ? '\n' : '') + content;
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('润色 SSE 请求已取消');
          return;
        }
        callbacks.onError?.({ message: error.message || '网络错误', code: 'NETWORK_ERROR' });
      }
    })();

    return controller;
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
