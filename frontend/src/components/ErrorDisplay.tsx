import { AlertCircle, Clock, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SseErrorData } from '@/lib/api';

interface ErrorDisplayProps {
  error: SseErrorData;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: {
    container: 'p-4',
    icon: 'w-12 h-12',
    iconWrapper: 'w-16 h-16 mb-4',
    title: 'text-lg',
    message: 'text-sm',
    button: 'px-4 py-1.5 text-sm',
  },
  md: {
    container: 'p-6',
    icon: 'w-10 h-10',
    iconWrapper: 'w-20 h-20 mb-6',
    title: 'text-2xl',
    message: 'text-base',
    button: 'px-6 py-2 text-sm',
  },
  lg: {
    container: 'p-8 min-h-[60vh]',
    icon: 'w-12 h-12',
    iconWrapper: 'w-24 h-24 mb-8',
    title: 'text-3xl',
    message: 'text-lg',
    button: 'px-8 py-3 text-base',
  },
};

export function ErrorDisplay({
  error,
  onRetry,
  retryText = '重试',
  className,
  size = 'md',
}: ErrorDisplayProps) {
  const isRateLimitError = error.code === 'RATE_LIMIT_EXCEEDED';
  const isNetworkError = error.code === 'NETWORK_ERROR';

  const sizes = sizeClasses[size];

  const getIcon = () => {
    if (isRateLimitError) {
      return <Clock className={cn(sizes.icon, 'text-orange-500')} />;
    }
    if (isNetworkError) {
      return <WifiOff className={cn(sizes.icon, 'text-gray-500')} />;
    }
    return <AlertCircle className={cn(sizes.icon, 'text-destructive')} />;
  };

  const getIconBg = () => {
    if (isRateLimitError) {
      return 'bg-orange-100 dark:bg-orange-900/30';
    }
    if (isNetworkError) {
      return 'bg-gray-100 dark:bg-gray-800';
    }
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const getTitle = () => {
    if (isRateLimitError) return '请求过于频繁';
    if (isNetworkError) return '网络连接失败';
    return '操作失败';
  };

  const getButtonStyle = () => {
    if (isRateLimitError) {
      return 'bg-orange-500 hover:bg-orange-600 text-white';
    }
    return 'bg-primary text-primary-foreground hover:shadow-lg';
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      <div
        className={cn(
          'rounded-full flex items-center justify-center',
          sizes.iconWrapper,
          getIconBg()
        )}
      >
        {getIcon()}
      </div>

      <h2 className={cn('font-bold mb-2', sizes.title, isRateLimitError && 'text-orange-600 dark:text-orange-400')}>
        {getTitle()}
      </h2>

      <p className={cn('text-muted-foreground mb-2 max-w-md', sizes.message)}>
        {error.message}
      </p>

      {isRateLimitError && error.retryAfterSeconds && (
        <p className="text-sm text-muted-foreground mb-6">
          建议等待{' '}
          <span className="font-bold text-orange-500">
            {error.retryAfterSeconds}
          </span>{' '}
          秒后重试
        </p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'rounded-full font-medium transition-all flex items-center gap-2',
            sizes.button,
            getButtonStyle()
          )}
        >
          <RefreshCw className="w-4 h-4" />
          {retryText}
        </button>
      )}
    </div>
  );
}

// 简化版：行内错误提示
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ message, onRetry, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
        className
      )}
    >
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <p className="flex-1 text-sm text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
        >
          重试
        </button>
      )}
    </div>
  );
}
