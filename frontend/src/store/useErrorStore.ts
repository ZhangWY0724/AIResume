import { create } from 'zustand';
import { SseErrorData } from '@/lib/api';
import { toast } from './useToastStore';

interface ErrorState {
  // 页面级错误（阻断型，需要用户处理）
  pageError: SseErrorData | null;
  setPageError: (error: SseErrorData | null) => void;
  clearPageError: () => void;

  // 处理 API 错误的统一方法
  handleApiError: (error: unknown, options?: HandleErrorOptions) => void;
}

interface HandleErrorOptions {
  // 是否显示 Toast（默认 true）
  showToast?: boolean;
  // 是否设置为页面级错误（默认 false）
  setAsPageError?: boolean;
  // 自定义错误消息
  customMessage?: string;
}

export const useErrorStore = create<ErrorState>((set) => ({
  pageError: null,

  setPageError: (error) => set({ pageError: error }),

  clearPageError: () => set({ pageError: null }),

  handleApiError: (error: unknown, options: HandleErrorOptions = {}) => {
    const { showToast: shouldShowToast = true, setAsPageError = false, customMessage } = options;

    let errorData: SseErrorData;

    // 标准化错误对象
    if (error instanceof Error) {
      if (error.name === 'RateLimitError') {
        const rateLimitError = error as Error & { retryAfterSeconds?: number };
        errorData = {
          message: customMessage || error.message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: rateLimitError.retryAfterSeconds,
        };
      } else if (error.name === 'AbortError') {
        // 请求被取消，不需要处理
        return;
      } else {
        errorData = {
          message: customMessage || error.message || '操作失败',
          code: 'UNKNOWN_ERROR',
        };
      }
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorData = error as SseErrorData;
      if (customMessage) {
        errorData.message = customMessage;
      }
    } else {
      errorData = {
        message: customMessage || '发生未知错误',
        code: 'UNKNOWN_ERROR',
      };
    }

    // 根据错误类型处理
    if (errorData.code === 'RATE_LIMIT_EXCEEDED') {
      if (setAsPageError) {
        set({ pageError: errorData });
      } else if (shouldShowToast) {
        toast.rateLimit(errorData.retryAfterSeconds);
      }
    } else if (errorData.code === 'NETWORK_ERROR') {
      if (shouldShowToast) {
        toast.error('网络连接失败', '请检查网络连接后重试');
      }
      if (setAsPageError) {
        set({ pageError: errorData });
      }
    } else {
      if (shouldShowToast) {
        toast.error('操作失败', errorData.message);
      }
      if (setAsPageError) {
        set({ pageError: errorData });
      }
    }

    // 打印到控制台便于调试
    console.error('[ErrorStore] Handled error:', errorData, error);
  },
}));

// 便捷 Hook：结合页面错误和清除
export function usePageError() {
  const { pageError, setPageError, clearPageError } = useErrorStore();
  return { pageError, setPageError, clearPageError };
}

// 便捷 Hook：获取错误处理方法
export function useErrorHandler() {
  return useErrorStore((state) => state.handleApiError);
}
