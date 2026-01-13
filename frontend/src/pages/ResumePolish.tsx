import { useState, useEffect, useRef } from 'react';
import { Download, ArrowLeft, Sparkles, Home, AlertCircle, Copy, Check, ChevronDown, FileText, FileType } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResumeStore } from '@/store/useResumeStore';
import { resumeApi, SseErrorData } from '@/lib/api';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export default function ResumePolish() {
  const navigate = useNavigate();
  const { resumeContent, uploadedFile, selectedIndustry } = useResumeStore();

  // 状态
  const [isPolishing, setIsPolishing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<SseErrorData | null>(null);
  const [polishedContent, setPolishedContent] = useState('');
  const [copied, setCopied] = useState(false);

  // 导出相关状态
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // 左侧视图模式
  const [viewMode, setViewMode] = useState<'text' | 'file'>(uploadedFile ? 'file' : 'text');
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const initialized = useRef(false);

  // 点击外部关闭导出菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 创建文件预览 URL
  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [uploadedFile]);

  // 启动润色
  useEffect(() => {
    if (!resumeContent || !selectedIndustry) {
      navigate('/upload');
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    setIsPolishing(true);
    setError(null);
    setPolishedContent('');

    resumeApi.polishStream(
      {
        content: resumeContent,
        industryId: selectedIndustry,
      },
      {
        onContent: (text) => {
          setPolishedContent(prev => prev + text);
        },
        onDone: () => {
          setIsCompleted(true);
          setIsPolishing(false);
        },
        onError: (err) => {
          setError(err);
          setIsPolishing(false);
          initialized.current = false;
        },
      }
    );
  }, [resumeContent, selectedIndustry, navigate]);

  // 复制功能
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(polishedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('复制失败', e);
    }
  };

  // 导出 Markdown
  const handleExportMd = () => {
    const blob = new Blob([polishedContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '润色简历.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // 导出 PDF
  const handleExportPdf = async () => {
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      const blob = await resumeApi.exportPdf({
        content: polishedContent,
        fileName: '润色简历',
        templateId: 'professional',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '润色简历.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF 导出失败', e);
      alert('PDF 导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const originalContent = resumeContent || '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between max-w-[95vw]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="返回首页"
            >
              <Home className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={() => navigate('/result')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回分析
            </button>
          </div>

          <h1 className="font-semibold text-lg flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI 智能润色
          </h1>

          <div className="flex gap-2">
            {isCompleted && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium hover:bg-muted transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制'}
                </button>

                {/* 导出下拉菜单 */}
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={isExporting}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:shadow-lg transition-all",
                      isExporting && "opacity-70 cursor-wait"
                    )}
                  >
                    {isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        导出中...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        导出
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* 下拉菜单 */}
                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border overflow-hidden z-30">
                      <button
                        onClick={handleExportMd}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left"
                      >
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="font-medium">Markdown 格式</div>
                          <div className="text-xs text-muted-foreground">适合编辑和复用</div>
                        </div>
                      </button>
                      <div className="border-t" />
                      <button
                        onClick={handleExportPdf}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left"
                      >
                        <FileType className="w-5 h-5 text-red-500" />
                        <div>
                          <div className="font-medium">PDF 格式</div>
                          <div className="text-xs text-muted-foreground">专业简历模板</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 双栏布局 */}
      <main className="flex-1 container mx-auto px-6 py-6 max-w-[95vw]">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 h-[calc(100vh-8rem)]">

          {/* 左侧：原文 */}
          <div className="flex flex-col h-full overflow-hidden border rounded-xl bg-card shadow-sm">
            <div className="p-3 border-b bg-muted/30 flex justify-between items-center">
              <span className="font-medium text-sm text-muted-foreground">原始简历</span>
              <div className="flex bg-background/50 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setViewMode('text')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    viewMode === 'text' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  文本
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
                  原件
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {viewMode === 'text' ? (
                <div className="h-full overflow-y-auto p-4">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {originalContent}
                  </pre>
                </div>
              ) : (
                <div className="h-full w-full">
                  {fileUrl ? (
                    <iframe
                      src={uploadedFile?.type === 'application/pdf' ? `${fileUrl}#view=FitH&zoom=page-width` : fileUrl}
                      className="w-full h-full border-none"
                      title="原件预览"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      无法预览文件
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：润色结果 */}
          <div className={cn(
            "flex flex-col h-full overflow-hidden border rounded-xl shadow-sm transition-all",
            isPolishing ? "border-primary ring-1 ring-primary/20" : "border-border"
          )}>
            <div className="p-3 border-b bg-primary/5 flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isCompleted ? "bg-green-500" : isPolishing ? "bg-primary animate-pulse" : "bg-muted"
              )} />
              <span className={cn(
                "font-medium text-sm",
                isCompleted ? "text-green-600" : isPolishing ? "text-primary" : "text-muted-foreground"
              )}>
                {isCompleted ? "润色完成" : isPolishing ? "AI 正在润色..." : "准备就绪"}
              </span>
            </div>

            <div className="flex-1 overflow-hidden">
              {error ? (
                <div className="flex flex-col items-center justify-center h-full p-6">
                  <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                  <p className="text-destructive mb-2 font-medium">{error.message}</p>
                  {error.retryAfterSeconds && (
                    <p className="text-sm text-muted-foreground mb-4">
                      建议等待 {error.retryAfterSeconds} 秒后重试
                    </p>
                  )}
                  <button
                    onClick={() => navigate('/result')}
                    className="px-6 py-2 rounded-full bg-primary text-primary-foreground hover:shadow-lg transition-all"
                  >
                    返回分析报告
                  </button>
                </div>
              ) : (
                <div className="h-full overflow-y-auto p-6">
                  <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                    <ReactMarkdown>{polishedContent}</ReactMarkdown>

                    {/* 打字光标 */}
                    {isPolishing && (
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                    )}

                    {/* 加载提示 */}
                    {isPolishing && !polishedContent && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span>正在连接 AI 服务...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 完成提示 */}
            {isCompleted && (
              <div className="p-3 border-t bg-green-50 dark:bg-green-950/20 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">
                  润色完成，可复制或导出结果
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
