import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, Home, Copy, Check, Eye, Download, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResumeStore } from '@/store/useResumeStore';
import { resumeApi, SseErrorData } from '@/lib/api';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { ErrorDisplay } from '@/components/ErrorDisplay';

export default function ResumePolish() {
  const navigate = useNavigate();
  const { resumeContent, uploadedFile, selectedIndustry, selectedModel } = useResumeStore();

  // 状态
  const [isPolishing, setIsPolishing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<SseErrorData | null>(null);
  const [polishedContent, setPolishedContent] = useState('');
  const [copied, setCopied] = useState(false);

  // PDF 预览相关状态
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  // 左侧视图模式
  const [viewMode, setViewMode] = useState<'text' | 'file'>(uploadedFile ? 'file' : 'text');
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const initialized = useRef(false);

  // 创建文件预览 URL
  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [uploadedFile]);

  // 清理 PDF blob URL
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

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
        modelType: selectedModel,
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

  // 预览 PDF
  const handlePreviewPdf = async () => {
    setIsGeneratingPdf(true);

    try {
      const blob = await resumeApi.exportPdf({
        content: polishedContent,
        fileName: '润色简历',
        templateId: 'professional',
      });

      // 清理旧的 blob URL
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }

      const url = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPdfBlobUrl(url);
      setShowPdfPreview(true);
    } catch (e) {
      console.error('PDF 生成失败', e);
      alert('PDF 生成失败，请重试');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 下载 PDF
  const handleDownloadPdf = () => {
    if (!pdfBlob || !pdfBlobUrl) return;

    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = '润色简历.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 关闭预览
  const handleClosePreview = () => {
    setShowPdfPreview(false);
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

                {/* 预览按钮 */}
                <button
                  onClick={handlePreviewPdf}
                  disabled={isGeneratingPdf}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:shadow-lg transition-all",
                    isGeneratingPdf && "opacity-70 cursor-wait"
                  )}
                >
                  {isGeneratingPdf ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      预览
                    </>
                  )}
                </button>
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
                <div className="flex items-center justify-center h-full">
                  <ErrorDisplay
                    error={error}
                    size="md"
                    onRetry={() => navigate('/result')}
                    retryText="返回分析报告"
                  />
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
                  润色完成，可复制或预览 PDF
                </span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* PDF 预览模态框 */}
      {showPdfPreview && pdfBlobUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 遮罩层 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClosePreview}
          />

          {/* 模态框内容 */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[90vw] h-[90vh] max-w-5xl flex flex-col overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                PDF 预览
              </h2>
              <button
                onClick={handleClosePreview}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PDF 预览区域 */}
            <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
              <iframe
                src={`${pdfBlobUrl}#view=FitH&zoom=page-width`}
                className="w-full h-full border-none"
                title="PDF 预览"
              />
            </div>

            {/* 底部操作栏 */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
              <button
                onClick={handleClosePreview}
                className="px-5 py-2.5 border rounded-full text-sm font-medium hover:bg-muted transition-all"
              >
                关闭
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:shadow-lg transition-all"
              >
                <Download className="w-4 h-4" />
                下载 PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
