import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/useResumeStore';
import { resumeApi } from '@/lib/api';

export default function FileUploader() {
  const { setResumeContent, setUploadedFile, uploadedFile } = useResumeStore();
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          "relative group cursor-pointer flex flex-col items-center justify-center w-full h-64 rounded-xl border-2 border-dashed transition-all duration-300 bg-background/50 backdrop-blur-sm",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          uploadedFile && "border-green-500/50 bg-green-500/5"
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center p-6 w-full"
            >
              <div className="relative mb-4">
                <FileText className="w-16 h-16 text-primary" />
                {isReading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="absolute -right-1 -bottom-1 bg-green-500 rounded-full p-1 border-2 border-background">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              
              <h3 className="font-medium text-lg truncate max-w-[80%] mb-1">
                {uploadedFile.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <div className="flex gap-3">
                <button
                  onClick={(e) => e.stopPropagation()} 
                  className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                >
                  更换文件
                </button>
                <button
                  onClick={removeFile}
                  className="px-4 py-2 text-sm font-medium text-destructive bg-destructive/10 rounded-md hover:bg-destructive/20 transition-colors"
                >
                  删除
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
             <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-1 rounded-full">
               <AlertCircle className="w-4 h-4" />
               {error}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
