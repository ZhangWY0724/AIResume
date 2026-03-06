import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Type, ArrowLeft, ArrowRight, Sparkles, Bot, ShieldAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResumeStore } from '@/store/useResumeStore';
import FileUploader from '@/components/FileUploader';
import ResumeInput from '@/components/ResumeInput';
import { cn } from '@/lib/utils';
import { INDUSTRIES } from '@/lib/constants';
import { AIModelType } from '@/lib/api';

type Tab = 'upload' | 'text';

// AI 模型配置
const AI_MODELS: { id: AIModelType; name: string; description: string }[] = [
  { id: 'gpt54', name: 'GPT-5.4', description: 'OpenAI 兼容接口' },
  { id: 'kilo', name: 'Kilo', description: 'Kilo AI（OpenAI 兼容网关）' },
  { id: 'gemini', name: 'Gemini', description: 'Google Gemini 模型' },
];

export default function ResumeUpload() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { selectedIndustry, resumeContent, selectedModel, setSelectedModel } = useResumeStore();
  const navigate = useNavigate();

  // Find current industry info
  const industry = INDUSTRIES.find(i => i.id === selectedIndustry);

  const handleNext = () => {
    if (!resumeContent.trim()) return;
    setShowDisclaimer(true);
  };

  const handleConfirmAnalyze = () => {
    setShowDisclaimer(false);
    navigate('/result');
  };

  const handleBack = () => {
    navigate('/select-industry');
  };

  if (!selectedIndustry) {
    // Redirect back if no industry selected (basic protection)
    // In a real app, use useEffect for this
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">请先选择行业</p>
          <button onClick={() => navigate('/select-industry')} className="text-primary hover:underline">去选择行业</button>
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
          <div className="w-full max-w-4xl flex justify-between items-center">
            {/* AI 模型选择器 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bot className="w-4 h-4" />
                <span>AI 模型：</span>
              </div>
              <div className="flex gap-2">
                {AI_MODELS.map((model) => {
                  const isDisabled = model.id === 'gemini';
                  const isSelected = selectedModel === model.id;

                  return (
                    <button
                      key={model.id}
                      disabled={isDisabled}
                      onClick={() => setSelectedModel(model.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        isDisabled
                          ? "bg-secondary/50 text-muted-foreground opacity-50 cursor-not-allowed"
                          : isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                      title={model.description}
                    >
                      {model.name}
                    </button>
                  );
                })}
              </div>
            </div>

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

        {showDisclaimer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => setShowDisclaimer(false)}
            />
            <div className="relative w-full max-w-2xl rounded-2xl border bg-background shadow-2xl">
              <div className="flex items-start justify-between p-5 border-b">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-semibold">分析前免责声明</h3>
                </div>
                <button
                  onClick={() => setShowDisclaimer(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="关闭"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>1. 您提交的简历内容将发送给 AI 模型进行解析与生成，用于完成当前分析与润色任务。</p>
                <p>2. AI 结果受模型能力影响，可能存在偏差或不完整信息，仅供参考，请您自行核验后使用。</p>
                <p>3. 本站不会将您的简历内容进行存储、分发或对外共享。</p>
              </div>

              <div className="p-5 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowDisclaimer(false)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmAnalyze}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  同意并开始分析
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
