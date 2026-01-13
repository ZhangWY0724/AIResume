import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ArrowLeft, Sparkles, Home, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResumeStore } from '@/store/useResumeStore';
import { resumeApi, PolishResponse, SseProgressData } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * 从流式 JSON 内容中实时提取 polishedContent 的值
 */
function extractPolishedContent(rawContent: string): string {
  // 查找 "polishedContent": " 的起始位置
  const startMatch = rawContent.match(/"polishedContent"\s*:\s*"/);
  if (!startMatch || startMatch.index === undefined) return '';

  const startIndex = startMatch.index + startMatch[0].length;
  const content = rawContent.substring(startIndex);

  // 处理转义字符并截取到闭合引号
  let result = '';
  let i = 0;
  while (i < content.length) {
    if (content[i] === '\\' && i + 1 < content.length) {
      // 处理转义字符
      const nextChar = content[i + 1];
      if (nextChar === 'n') result += '\n';
      else if (nextChar === 't') result += '\t';
      else if (nextChar === 'r') result += '';
      else if (nextChar === '"') result += '"';
      else if (nextChar === '\\') result += '\\';
      else result += nextChar;
      i += 2;
    } else if (content[i] === '"') {
      // 找到闭合引号，结束
      break;
    } else {
      result += content[i];
      i++;
    }
  }

  return result;
}

export default function ResumePolish() {
  const navigate = useNavigate();
  const { resumeContent, uploadedFile, selectedIndustry } = useResumeStore();
  const [isPolishing, setIsPolishing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PolishResponse | null>(null);
  const [activeChangeIndex, setActiveChangeIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'text' | 'file'>('text');
  const [progress, setProgress] = useState<SseProgressData | null>(null);
  const [streamedContent, setStreamedContent] = useState('');

  // 从流式 JSON 中提取 polishedContent 用于实时显示
  const displayContent = useMemo(() => {
    return extractPolishedContent(streamedContent);
  }, [streamedContent]);

  // 如果没有简历内容，使用 placeholder
  const originalContent = resumeContent || "（此处应显示您的原始简历内容...）";

  // 生成文件预览 URL
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [uploadedFile]);

  useEffect(() => {
    if (!resumeContent || !selectedIndustry) {
      navigate('/upload');
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    setIsPolishing(true);
    setError(null);
    setProgress({ percentage: 0, stage: '准备中', message: '正在初始化...' });
    setStreamedContent('');

    // 使用流式 API
    resumeApi.polishStream(
      {
        content: resumeContent,
        industryId: selectedIndustry,
      },
      {
        onProgress: (data) => {
          console.log('[ResumePolish] 收到进度:', data);
          setProgress(data);
        },
        onChunk: (content) => {
          setStreamedContent(prev => prev + content);
        },
        onComplete: (response) => {
          console.log('[ResumePolish] 润色完成:', response);
          setResult(response);
          setIsCompleted(true);
          setIsPolishing(false);
          setProgress(null);
        },
        onError: (err) => {
          console.error('[ResumePolish] 润色失败:', err);
          setError(err.message || '润色失败，请重试');
          setIsPolishing(false);
          setProgress(null);
          initialized.current = false; // 允许重试
        },
      }
    );
  }, [resumeContent, selectedIndustry, navigate]);

  // Changes 列表的滚动播放
  useEffect(() => {
    if (!isCompleted || !result?.changes.length) return;
    const interval = setInterval(() => {
      setActiveChangeIndex(prev => (prev + 1) % result.changes.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isCompleted, result]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="重选行业"
            >
              <Home className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={() => navigate('/result')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回分析报告
            </button>
          </div>

          <h1 className="font-semibold text-lg flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI 智能润色
          </h1>

          <div className="flex gap-3">
             {isCompleted && (
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:shadow-lg transition-all animate-in fade-in zoom-in">
                  <Download className="w-4 h-4" />
                  导出 PDF
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-4rem)]">

        {/* Left Column: Original */}
        <div className="flex flex-col h-full overflow-hidden border rounded-xl bg-card shadow-sm">
          <div className="p-2 border-b bg-muted/30 flex justify-between items-center">
             <div className="flex bg-background/50 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setViewMode('text')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    viewMode === 'text' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  解析文本
                </button>
                <button
                  onClick={() => setViewMode('file')}
                  disabled={!uploadedFile}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    viewMode === 'file' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    !uploadedFile && "opacity-50 cursor-not-allowed"
                  )}
                >
                  原件预览
                </button>
             </div>
             {uploadedFile && <span className="text-xs text-muted-foreground mr-2 truncate max-w-[150px]">{uploadedFile.name}</span>}
          </div>

          <div className="flex-1 overflow-hidden relative bg-muted/10">
            {viewMode === 'text' ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {originalContent}
                </div>
              </div>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center">
                {fileUrl ? (
                  <iframe src={fileUrl} className="w-full h-full border-none" title="Resume Preview" />
                ) : (
                  <div className="text-muted-foreground text-sm">无法预览文件</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Polished */}
        <div className={cn(
          "flex flex-col h-full overflow-hidden border rounded-xl shadow-md transition-all duration-500 relative",
          isPolishing ? "border-primary ring-1 ring-primary/20 bg-background" : "bg-card border-border"
        )}>
          {/* Active AI Status Overlay */}
          <div className="p-4 border-b bg-primary/5 flex justify-between items-center relative overflow-hidden">
             <div className="flex items-center gap-2 z-10">
               <div className={cn("w-2 h-2 rounded-full", isCompleted ? "bg-green-500" : "bg-primary animate-pulse")} />
               <span className={cn("font-medium text-sm", isCompleted ? "text-green-600" : "text-primary")}>
                 {isCompleted ? "润色完成" : isPolishing ? (progress?.stage || "AI 正在重写...") : "准备就绪"}
               </span>
             </div>
             {/* Progress percentage */}
             {isPolishing && progress && (
               <span className="text-xs text-muted-foreground">{progress.percentage}%</span>
             )}
             {/* Animated Progress Bar */}
             {!isCompleted && isPolishing && progress && (
               <motion.div
                 className="absolute bottom-0 left-0 h-0.5 bg-primary z-0"
                 initial={{ width: "0%" }}
                 animate={{ width: `${progress.percentage}%` }}
                 transition={{ duration: 0.3, ease: "easeOut" }}
               />
             )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 relative">
            {error ? (
              <div className="flex flex-col items-center justify-center h-full">
                <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                <p className="text-destructive mb-4">{error}</p>
                <button
                  onClick={() => navigate('/result')}
                  className="px-6 py-2 rounded-full bg-primary text-primary-foreground hover:shadow-lg transition-all"
                >
                  返回分析报告
                </button>
              </div>
            ) : isPolishing && !isCompleted ? (
              // 流式输出：显示正在接收的内容（从 JSON 中提取 polishedContent）
              <div className="prose prose-sm max-w-none text-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {displayContent || (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>{progress?.message || '正在等待 AI 响应...'}</span>
                  </div>
                )}
                {displayContent && (
                  <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5" />
                )}
              </div>
            ) : isCompleted && result ? (
              // 完成后显示润色后的内容
              <div className="prose prose-sm max-w-none text-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {result.polishedContent}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Floating AI Insights Panel */}
          <AnimatePresence>
            {isCompleted && result?.changes && result.changes.length > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-6 left-6 right-6 bg-popover/90 backdrop-blur-md border rounded-xl p-4 shadow-lg ring-1 ring-black/5"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-blue-500/10 text-blue-600 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      优化说明
                    </h4>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={activeChangeIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="text-sm font-medium"
                      >
                        {result.changes[activeChangeIndex].reason}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div className="flex gap-1 self-center">
                    {result.changes.map((_, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                          idx === activeChangeIndex ? "bg-primary" : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}
