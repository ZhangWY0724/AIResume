import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Type, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResumeStore } from '@/store/useResumeStore';
import FileUploader from '@/components/FileUploader';
import ResumeInput from '@/components/ResumeInput';
import { cn } from '@/lib/utils';
import { INDUSTRIES } from '@/lib/constants';

type Tab = 'upload' | 'text';

export default function ResumeUpload() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const { selectedIndustry, resumeContent } = useResumeStore();
  const navigate = useNavigate();

  // Find current industry info
  const industry = INDUSTRIES.find(i => i.id === selectedIndustry);

  const handleNext = () => {
    if (!resumeContent.trim()) return;
    navigate('/result');
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!selectedIndustry) {
    // Redirect back if no industry selected (basic protection)
    // In a real app, use useEffect for this
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">请先选择行业</p>
          <button onClick={() => navigate('/')} className="text-primary hover:underline">返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px] pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b bg-background/80 backdrop-blur-md sticky top-0">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            重选行业
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">当前行业：</span>
            <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium bg-secondary", industry?.color)}>
              {industry?.name}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-bold mb-3">上传您的简历</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            我们支持 PDF, Word 或纯文本格式。AI 将会深度分析您的简历内容。
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="bg-secondary/50 p-1 rounded-lg flex mb-8 w-full max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'upload' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <FileText className="w-4 h-4" />
            文件上传
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'text' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Type className="w-4 h-4" />
            直接粘贴
          </button>
        </div>

        {/* Content Area */}
        <div className="w-full max-w-4xl mb-12 min-h-[400px]">
           {activeTab === 'upload' ? <FileUploader /> : <ResumeInput />}
        </div>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background/80 backdrop-blur-md flex justify-center z-20">
          <div className="w-full max-w-4xl flex justify-end">
            <button
              onClick={handleNext}
              disabled={!resumeContent.trim()}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all duration-300",
                resumeContent.trim()
                  ? "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Sparkles className="w-4 h-4" />
              开始分析
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
