import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, ArrowLeft, Sparkles, Home, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResumeStore } from '@/store/useResumeStore';
import { resumeApi, PolishResponse, SseProgressData, PolishChange } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * 从流式 JSON 内容中实时提取 polishedContent 的值
 */
function extractPolishedContent(rawContent: string): string {
  const startMatch = rawContent.match(/"polishedContent"\s*:\s*"/);
  if (!startMatch || startMatch.index === undefined) return '';

  const startIndex = startMatch.index + startMatch[0].length;
  const content = rawContent.substring(startIndex);

  let result = '';
  let i = 0;
  while (i < content.length) {
    if (content[i] === '\\' && i + 1 < content.length) {
      const nextChar = content[i + 1];
      if (nextChar === 'n') result += '\n';
      else if (nextChar === 't') result += '\t';
      else if (nextChar === 'r') result += '';
      else if (nextChar === '"') result += '"';
      else if (nextChar === '\\') result += '\\';
      else result += nextChar;
      i += 2;
    } else if (content[i] === '"') {
      break;
    } else {
      result += content[i];
      i++;
    }
  }

  return result;
}

/**
 * 在内容中查找文本的位置，支持多种匹配策略
 * 返回 { start, end } 或 null
 */
function findTextInContent(
  content: string,
  searchText: string,
  startFrom: number,
  excludeRanges: Array<{ start: number; end: number }>
): { start: number; end: number } | null {
  if (!searchText || searchText.trim() === '') return null;

  // 检查索引是否与已匹配区域冲突
  const isOverlapping = (start: number, end: number) =>
    excludeRanges.some(r => !(end <= r.start || start >= r.end));

  // 策略1: 精确匹配
  let idx = content.indexOf(searchText, startFrom);
  while (idx !== -1) {
    if (!isOverlapping(idx, idx + searchText.length)) {
      return { start: idx, end: idx + searchText.length };
    }
    idx = content.indexOf(searchText, idx + 1);
  }

  // 策略2: trim 后匹配
  const trimmed = searchText.trim();
  if (trimmed !== searchText) {
    idx = content.indexOf(trimmed, startFrom);
    while (idx !== -1) {
      if (!isOverlapping(idx, idx + trimmed.length)) {
        return { start: idx, end: idx + trimmed.length };
      }
      idx = content.indexOf(trimmed, idx + 1);
    }
  }

  // 策略3: 使用关键片段匹配（取前30个非空白字符作为锚点）
  const keyFragment = trimmed.replace(/\s+/g, '').substring(0, 30);
  if (keyFragment.length >= 5) {
    // 在内容中搜索包含这个关键片段的区域
    const contentNoSpace = content.replace(/\s+/g, '');
    const fragIdx = contentNoSpace.indexOf(keyFragment);
    if (fragIdx !== -1) {
      // 将无空格索引映射回原始索引
      let originalIdx = 0;
      let noSpaceIdx = 0;
      while (noSpaceIdx < fragIdx && originalIdx < content.length) {
        if (!/\s/.test(content[originalIdx])) {
          noSpaceIdx++;
        }
        originalIdx++;
      }

      // 找到起始位置后，尝试确定结束位置
      // 向前找到合适的边界（行首或标点）
      let start = originalIdx;
      while (start > 0 && !/[\n。！？；：]/.test(content[start - 1])) {
        start--;
        if (originalIdx - start > 50) break; // 最多回退50字符
      }

      // 向后扩展到合适的边界
      let end = originalIdx + keyFragment.length;
      while (end < content.length && !/[\n。！？；：]/.test(content[end])) {
        end++;
        if (end - originalIdx > trimmed.length + 50) break;
      }

      // 检查是否冲突
      if (!isOverlapping(start, end)) {
        return { start, end };
      }
    }
  }

  // 策略4: 行级匹配 - 查找包含关键词的整行
  const words = trimmed.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 0) {
    const lines = content.split('\n');
    let lineStart = 0;
    for (const line of lines) {
      const lineEnd = lineStart + line.length;
      // 检查该行是否包含多个关键词
      const matchCount = words.filter(w => line.includes(w)).length;
      if (matchCount >= Math.min(2, words.length)) {
        if (!isOverlapping(lineStart, lineEnd)) {
          return { start: lineStart, end: lineEnd };
        }
      }
      lineStart = lineEnd + 1; // +1 for \n
    }
  }

  return null;
}

/**
 * 将润色后的文本按 changes 进行分段，标记哪些是修改过的
 */
function segmentContent(
  content: string,
  changes: PolishChange[]
): Array<{ text: string; changeIndex: number | null }> {
  if (!changes || changes.length === 0) {
    return [{ text: content, changeIndex: null }];
  }

  const segments: Array<{ text: string; changeIndex: number | null }> = [];
  const matches: Array<{ start: number; end: number; changeIndex: number }> = [];

  // 按 polished 长度降序排序，优先匹配长文本（更精确）
  const sortedChanges = changes
    .map((change, idx) => ({ change, idx }))
    .sort((a, b) => (b.change.polished?.length || 0) - (a.change.polished?.length || 0));

  for (const { change, idx } of sortedChanges) {
    const polished = change.polished;
    if (!polished || polished.trim() === '') continue;

    const match = findTextInContent(content, polished, 0, matches);
    if (match) {
      matches.push({
        start: match.start,
        end: match.end,
        changeIndex: idx,
      });
    }
  }

  // 按位置排序
  matches.sort((a, b) => a.start - b.start);

  // 合并重叠区域
  const mergedMatches: typeof matches = [];
  for (const match of matches) {
    if (mergedMatches.length === 0) {
      mergedMatches.push(match);
    } else {
      const last = mergedMatches[mergedMatches.length - 1];
      if (match.start < last.end) {
        // 重叠，扩展并保留第一个的 changeIndex
        last.end = Math.max(last.end, match.end);
      } else {
        mergedMatches.push(match);
      }
    }
  }

  // 构建分段
  let currentPos = 0;
  for (const match of mergedMatches) {
    if (match.start > currentPos) {
      segments.push({
        text: content.substring(currentPos, match.start),
        changeIndex: null,
      });
    }
    segments.push({
      text: content.substring(match.start, match.end),
      changeIndex: match.changeIndex,
    });
    currentPos = match.end;
  }

  if (currentPos < content.length) {
    segments.push({
      text: content.substring(currentPos),
      changeIndex: null,
    });
  }

  return segments;
}

export default function ResumePolish() {
  const navigate = useNavigate();
  const { resumeContent, uploadedFile, selectedIndustry } = useResumeStore();
  const [isPolishing, setIsPolishing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PolishResponse | null>(null);
  const [viewMode, setViewMode] = useState<'text' | 'file'>(uploadedFile ? 'file' : 'text');
  const [progress, setProgress] = useState<SseProgressData | null>(null);
  const [streamedContent, setStreamedContent] = useState('');
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null);

  // 引用
  const textRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const annotationRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const textContainerRef = useRef<HTMLDivElement>(null);
  const annotationContainerRef = useRef<HTMLDivElement>(null);

  const displayContent = useMemo(() => {
    return extractPolishedContent(streamedContent);
  }, [streamedContent]);

  const contentSegments = useMemo(() => {
    if (!isCompleted || !result) return [];
    return segmentContent(result.polishedContent, result.changes);
  }, [isCompleted, result]);

  const originalContent = resumeContent || "（此处应显示您的原始简历内容...）";

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

    resumeApi.polishStream(
      {
        content: resumeContent,
        industryId: selectedIndustry,
      },
      {
        onProgress: (data) => {
          setProgress(data);
        },
        onChunk: (content) => {
          setStreamedContent(prev => prev + content);
        },
        onComplete: (response) => {
          setResult(response);
          setIsCompleted(true);
          setIsPolishing(false);
          setProgress(null);
        },
        onError: (err) => {
          setError(err.message || '润色失败，请重试');
          setIsPolishing(false);
          setProgress(null);
          initialized.current = false;
        },
      }
    );
  }, [resumeContent, selectedIndustry, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-[1600px]">
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

      {/* 三栏布局 */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-[1600px] h-[calc(100vh-4rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-4 h-full">

          {/* 左侧：原文预览 */}
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
               {uploadedFile && <span className="text-xs text-muted-foreground mr-2 truncate max-w-[120px]">{uploadedFile.name}</span>}
            </div>

            <div className="flex-1 overflow-hidden relative bg-muted/10">
              {viewMode === 'text' ? (
                <div className="h-full overflow-y-auto p-4">
                  <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap font-mono text-xs leading-relaxed">
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

          {/* 中间：润色后文本 */}
          <div className={cn(
            "flex flex-col h-full overflow-hidden border rounded-xl shadow-md transition-all duration-500",
            isPolishing ? "border-primary ring-1 ring-primary/20 bg-background" : "bg-card border-border"
          )}>
            {/* 状态栏 */}
            <div className="p-3 border-b bg-primary/5 flex justify-between items-center relative overflow-hidden">
               <div className="flex items-center gap-2 z-10">
                 <div className={cn("w-2 h-2 rounded-full", isCompleted ? "bg-green-500" : "bg-primary animate-pulse")} />
                 <span className={cn("font-medium text-sm", isCompleted ? "text-green-600" : "text-primary")}>
                   {isCompleted ? "润色完成" : isPolishing ? (progress?.stage || "AI 正在重写...") : "准备就绪"}
                 </span>
               </div>
               {isPolishing && progress && (
                 <span className="text-xs text-muted-foreground">{progress.percentage}%</span>
               )}
               {!isCompleted && isPolishing && progress && (
                 <motion.div
                   className="absolute bottom-0 left-0 h-0.5 bg-primary z-0"
                   initial={{ width: "0%" }}
                   animate={{ width: `${progress.percentage}%` }}
                   transition={{ duration: 0.3, ease: "easeOut" }}
                 />
               )}
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-hidden relative">
              {error ? (
                <div className="flex flex-col items-center justify-center h-full p-6">
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
                <div className="h-full overflow-y-auto p-4">
                  <div className="prose prose-sm max-w-none text-foreground font-mono text-xs leading-relaxed whitespace-pre-wrap">
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
                </div>
              ) : isCompleted && result ? (
                <div
                  ref={textContainerRef}
                  className="h-full overflow-y-auto p-4"
                >
                  <div className="prose prose-sm max-w-none text-foreground font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {contentSegments.map((segment, idx) => (
                      segment.changeIndex !== null ? (
                        <span
                          key={idx}
                          ref={(el) => {
                            if (el) textRefs.current.set(segment.changeIndex!, el);
                          }}
                          className={cn(
                            "font-bold relative cursor-pointer transition-all duration-200 px-0.5 -mx-0.5 rounded",
                            activeAnnotation === segment.changeIndex
                              ? "bg-primary/20 text-primary"
                              : "bg-yellow-100/50 hover:bg-yellow-100"
                          )}
                          onMouseEnter={() => setActiveAnnotation(segment.changeIndex)}
                          onMouseLeave={() => setActiveAnnotation(null)}
                        >
                          {segment.text}
                          {/* 小标记 */}
                          <sup className={cn(
                            "text-[9px] font-normal ml-0.5 transition-colors",
                            activeAnnotation === segment.changeIndex ? "text-primary" : "text-muted-foreground"
                          )}>
                            [{segment.changeIndex! + 1}]
                          </sup>
                        </span>
                      ) : (
                        <span key={idx}>{segment.text}</span>
                      )
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* 右侧：批注区域 */}
          <div className="flex flex-col h-full overflow-hidden border rounded-xl bg-card shadow-sm">
            <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">优化说明</span>
              {result && (
                <span className="text-xs text-muted-foreground">({result.changes.length})</span>
              )}
            </div>

            <div
              ref={annotationContainerRef}
              className="flex-1 overflow-y-auto p-3 space-y-3"
            >
              {!isCompleted ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                  <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mb-2" />
                  <span>等待润色完成...</span>
                </div>
              ) : result?.changes.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  暂无优化说明
                </div>
              ) : (
                result?.changes.map((change, idx) => (
                  <div
                    key={idx}
                    ref={(el) => {
                      if (el) annotationRefs.current.set(idx, el);
                    }}
                    className={cn(
                      "p-3 rounded-lg border text-xs transition-all duration-200 cursor-pointer",
                      activeAnnotation === idx
                        ? "bg-primary/5 border-primary/40 shadow-md ring-1 ring-primary/20"
                        : "bg-background border-border/60 hover:border-border hover:shadow-sm"
                    )}
                    onMouseEnter={() => setActiveAnnotation(idx)}
                    onMouseLeave={() => setActiveAnnotation(null)}
                  >
                    {/* 序号标签 */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className={cn(
                        "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold shrink-0",
                        activeAnnotation === idx
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {idx + 1}
                      </span>
                      <span className="text-muted-foreground leading-relaxed flex-1">
                        {change.reason}
                      </span>
                    </div>
                    {/* 原文对比 */}
                    {change.original && (
                      <div className="mt-2 pt-2 border-t border-dashed border-border/50">
                        <div className="text-[10px] text-muted-foreground/70 mb-1">原文:</div>
                        <div className="text-muted-foreground/60 line-through text-[10px] leading-relaxed">
                          {change.original.length > 80 ? change.original.substring(0, 80) + '...' : change.original}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
