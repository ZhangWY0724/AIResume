import axios, { AxiosError } from 'axios';

// 自定义错误类型
export class RateLimitError extends Error {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

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
  (error: AxiosError<{ message?: string; code?: string; retryAfterSeconds?: number }>) => {
    console.error('API Error:', error);

    // 处理 429 Too Many Requests 错误
    if (error.response?.status === 429) {
      const data = error.response.data;
      const retryAfter = data?.retryAfterSeconds ||
        parseInt(error.response.headers['retry-after'] || '30', 10);
      const message = data?.message || 'AI 服务请求过于频繁，请稍后重试';

      return Promise.reject(new RateLimitError(message, retryAfter));
    }

    return Promise.reject(error);
  }
);

// --- DTO Interfaces ---

// AI 模型类型 (0 = 智谱, 1 = Gemini, 2 = Kilo)
export type AIModelType = 'zhipu' | 'gemini' | 'kilo';

// 将前端模型类型转换为后端枚举值
export const modelTypeToNumber = (type: AIModelType): number => {
  switch (type) {
    case 'zhipu':
      return 0;
    case 'gemini':
      return 1;
    case 'kilo':
      return 2;
    default: {
      const _exhaustiveCheck: never = type;
      return _exhaustiveCheck;
    }
  }
};

export interface DimensionScore {
  name: string;
  score: number;
  comment: string;
}

export interface AnalyzeRequest {
  content: string;
  industryId: string;
  modelType?: AIModelType;
}

export interface ImprovementItem {
  problem: string;
  original: string;
  example: string;
}

export interface AnalyzeResponse {
  score: number;
  level: string;
  dimensions: DimensionScore[];
  comment: string;
  strengths: string[];
  improvements: ImprovementItem[];
  atsScore: number;
  industryFitScore?: number;
  missingKeywords: string[];
}

export interface PolishRequest {
  content: string;
  industryId: string;
  targetPosition?: string;
  modelType?: AIModelType;
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
  modelType?: AIModelType;
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
  modelType?: AIModelType;
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

export interface PdfExportRequest {
  content: string;
  templateId?: string;
  fileName?: string;
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
  retryAfterSeconds?: number;
}

export type AnalyzeStreamCallback = {
  onProgress?: (data: SseProgressData) => void;
  onChunk?: (content: string) => void;
  onComplete?: (result: AnalyzeResponse) => void;
  onError?: (error: SseErrorData) => void;
};

// 简化的润色流式回调（只有 content/done/error）
export type PolishStreamCallback = {
  onContent?: (text: string) => void;
  onDone?: () => void;
  onError?: (error: SseErrorData) => void;
};

// --- Helper Function ---

/**
 * 统一处理流式响应错误 (包含 429 处理)
 */
async function handleStreamResponse(
  response: Response, 
  onError?: (error: SseErrorData) => void
): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
  console.log('[API] Stream fetch 响应状态:', response.status, response.ok);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // 处理 429 错误
    if (response.status === 429) {
      const retryAfter = errorData.retryAfterSeconds ||
        parseInt(response.headers.get('Retry-After') || '30', 10);
      
      onError?.({
        message: errorData.message || 'AI 服务请求过于频繁，请稍后重试',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: retryAfter
      });
      return null;
    }

    onError?.({ 
      message: errorData.message || `请求失败 (${response.status})`, 
      code: 'HTTP_ERROR' 
    });
    return null;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError?.({ message: '无法读取响应流', code: 'STREAM_ERROR' });
    return null;
  }

  return reader;
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
    const requestBody = {
      ...data,
      modelType: data.modelType ? modelTypeToNumber(data.modelType) : 0,
    };
    const response = await api.post<AnalyzeResponse>('/Resume/analyze', requestBody, {
      timeout: 180000, // 分析等待完整结果返回，超时放宽到 180s
    });
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

    // 转换模型类型为后端枚举值
    const requestBody = {
      ...data,
      modelType: data.modelType ? modelTypeToNumber(data.modelType) : 0,
    };

    console.log('[API] analyzeStream 开始，请求数据:', requestBody);

    (async () => {
      try {
        console.log('[API] 发起 fetch 请求...');
        const response = await fetch('/api/Resume/analyze-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        const reader = await handleStreamResponse(response, callbacks.onError);
        if (!reader) return;

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
   * 简历润色（SSE 流式响应，返回纯 Markdown 文本流）
   * 事件类型：content（文本片段）、done（完成）、error（错误）
   */
  polishStream: (data: PolishRequest, callbacks: PolishStreamCallback): AbortController => {
    const controller = new AbortController();

    // 转换模型类型为后端枚举值
    const requestBody = {
      ...data,
      modelType: data.modelType ? modelTypeToNumber(data.modelType) : 0,
    };

    (async () => {
      try {
        const response = await fetch('/api/Resume/polish-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        const reader = await handleStreamResponse(response, callbacks.onError);
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') {
              if (currentData) {
                try {
                  const eventData = JSON.parse(currentData);
                  const type = currentEvent || 'message';

                  switch (type) {
                    case 'content':
                      callbacks.onContent?.(eventData.text);
                      break;
                    case 'done':
                      callbacks.onDone?.();
                      break;
                    case 'error':
                      callbacks.onError?.(eventData as SseErrorData);
                      break;
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
        if (error.name === 'AbortError') return;
        callbacks.onError?.({ message: error.message || '网络错误', code: 'NETWORK_ERROR' });
      }
    })();

    return controller;
  },

  /**
   * 职位匹配 (JD Match)
   */
  matchJob: async (data: MatchRequest): Promise<MatchResponse> => {
    const requestBody = {
      ...data,
      modelType: data.modelType ? modelTypeToNumber(data.modelType) : 0,
    };
    const response = await api.post<MatchResponse>('/Resume/match', requestBody);
    return response.data;
  },

  /**
   * 面试预测
   * @param data 请求数据
   * @param signal 可选的 AbortSignal，用于取消请求
   */
  predictInterview: async (data: InterviewRequest, signal?: AbortSignal): Promise<InterviewResponse> => {
    const requestBody = {
      ...data,
      modelType: data.modelType ? modelTypeToNumber(data.modelType) : 0,
    };
    const response = await api.post<InterviewResponse>('/Resume/interview', requestBody, {
      timeout: 180000, // 面试预测需要更长时间，设置 180s 超时
      signal, // 支持取消请求
    });
    return response.data;
  },

  /**
   * 导出 PDF 简历
   * @param data 导出请求
   * @returns PDF Blob
   */
  exportPdf: async (data: PdfExportRequest): Promise<Blob> => {
    const response = await api.post('/Resume/export/pdf', data, {
      responseType: 'blob',
      timeout: 60000,
    });
    return response.data;
  },
};
