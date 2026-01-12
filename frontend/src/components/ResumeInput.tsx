import { useResumeStore } from '@/store/useResumeStore';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function ResumeInput() {
  const { resumeContent, setResumeContent } = useResumeStore();

  return (
    <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-2 flex justify-between items-center">
        <label className="text-sm font-medium text-muted-foreground">
          或者直接粘贴简历内容：
        </label>
        <span className={cn("text-xs", resumeContent.length > 500 ? "text-green-500" : "text-muted-foreground")}>
          {resumeContent.length} 字
        </span>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 relative"
      >
        <textarea
          value={resumeContent}
          onChange={(e) => setResumeContent(e.target.value)}
          placeholder="在此处粘贴您的简历文本内容（包含个人简介、工作经历、项目经验、技能清单等）..."
          className="w-full h-[400px] p-4 rounded-xl border bg-background/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent"
        />
        
        {resumeContent.length === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/30 text-6xl">
            Create
          </div>
        )}
      </motion.div>
    </div>
  );
}
