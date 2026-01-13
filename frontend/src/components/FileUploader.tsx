import { useCallback, useState, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, CheckCircle, AlertCircle, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/useResumeStore';
import { resumeApi } from '@/lib/api';

export default function FileUploader() {
  const { setResumeContent, setUploadedFile, uploadedFile, resumeContent } = useResumeStore();
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      return URL.createObjectURL(uploadedFile);
    }
    return null;
  }, [uploadedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setIsReading(true);

    try {
      // 调用后端 API 解析文件
      const response = await resumeApi.uploadFile(file);

      if (response.success) {
        setResumeContent(response.content);
      } else {
        setError(response.errorMessage || '文件解析失败');
      }
    } catch (err: any) {
      console.error('文件上传失败:', err);
      setError(err.response?.data?.message || '文件上传失败，请重试');
    } finally {
      setIsReading(false);
    }
  }, [setResumeContent, setUploadedFile]);

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
    setResumeContent('');
    setError(null);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    multiple: false,
    noClick: !!uploadedFile // Disable click when file is uploaded to prevent accidental replacement when clicking preview
  });

  const renderPreview = () => {
    if (isReading) {
      return (
        <div className="w-full h-[600px] flex flex-col items-center justify-center bg-secondary/20 rounded-lg border border-dashed">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground animate-pulse">正在智能解析简历内容...</p>
        </div>
      );
    }

    if (uploadedFile?.type === 'application/pdf' && previewUrl) {
      return (
        <div className="w-full h-[800px] rounded-lg border bg-white overflow-hidden shadow-sm">
           <iframe 
             src={previewUrl} 
             className="w-full h-full" 
             title="Resume Preview"
           />
        </div>
      );
    }
    
    // For Word/Text, show the parsed text content
    return (
       <div className="w-full h-[800px] overflow-y-auto p-8 bg-white rounded-lg border text-left shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              解析内容预览
            </h4>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
              {uploadedFile?.type === 'text/plain' ? 'TXT 纯文本' : 'Word 文档解析'}
            </span>
          </div>
          <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/80 max-w-none prose prose-sm">
            {resumeContent || <span className="text-muted-foreground italic">等待解析结果...</span>}
          </div>
       </div>
    );
  };

  return (
    <div className="w-full mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          "relative transition-all duration-300",
          !uploadedFile 
            ? "cursor-pointer flex flex-col items-center justify-center w-full h-64 rounded-xl border-2 border-dashed bg-background/50 backdrop-blur-sm hover:border-primary/50 hover:bg-muted/50"
            : "cursor-default",
          isDragActive && !uploadedFile && "border-primary bg-primary/5",
          !uploadedFile ? "border-muted-foreground/25" : "border-transparent"
        )}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {!uploadedFile ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-center p-6"
            >
              <div className="p-4 rounded-full bg-secondary mb-4 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-lg font-medium mb-1">
                {isDragActive ? "释放文件以上传" : "点击或拖拽文件到此处"}
              </p>
              <p className="text-sm text-muted-foreground">
                支持 PDF, Word, TXT (最大 10MB)
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="file-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col gap-6"
            >
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-4 bg-background border rounded-lg shadow-sm">
                 <div className="flex items-center gap-4 overflow-hidden">
                    <div className={cn("p-2.5 rounded-lg flex-shrink-0", isReading ? "bg-muted animate-pulse" : "bg-green-100 dark:bg-green-900/30")}>
                       <FileText className={cn("w-6 h-6", isReading ? "text-muted-foreground" : "text-green-600 dark:text-green-400")} />
                    </div>
                    <div className="flex flex-col min-w-0">
                       <h3 className="font-medium truncate max-w-[200px] sm:max-w-md text-sm sm:text-base" title={uploadedFile.name}>
                         {uploadedFile.name}
                       </h3>
                       <div className="flex items-center gap-2">
                         <p className="text-xs text-muted-foreground">
                           {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                         </p>
                         {!isReading && !error && (
                           <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                             <CheckCircle className="w-3 h-3" /> 解析完成
                           </span>
                         )}
                         {error && (
                           <span className="flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                             <AlertCircle className="w-3 h-3" /> 解析失败
                           </span>
                         )}
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        open();
                      }} 
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-full transition-colors"
                      title="更换文件"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={removeFile}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                      title="删除文件"
                    >
                      <X className="w-5 h-5" />
                    </button>
                 </div>
              </div>

              {/* Preview Area */}
              {error ? (
                 <div className="w-full h-[400px] flex flex-col items-center justify-center bg-destructive/5 rounded-lg border border-destructive/20 border-dashed">
                   <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                   <p className="text-destructive font-medium mb-2">简历解析失败</p>
                   <p className="text-sm text-muted-foreground max-w-sm text-center">{error}</p>
                   <button 
                     onClick={(e) => { e.stopPropagation(); open(); }}
                     className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                   >
                     重新上传
                   </button>
                 </div>
              ) : (
                 renderPreview()
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
