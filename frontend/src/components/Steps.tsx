import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'industry', path: '/', label: '选择行业' },
  { id: 'upload', path: '/upload', label: '上传简历' },
  { id: 'analysis', path: '/result', label: 'AI 分析' }, // /analyze 是中间态，归为 AI 分析
  { id: 'polish', path: '/polish', label: '智能润色' },
];

export default function Steps() {
  const location = useLocation();
  const currentPath = location.pathname;

  // Determine current step index
  let activeIndex = 0;
  if (currentPath === '/') activeIndex = 0;
  else if (currentPath === '/upload') activeIndex = 1;
  else if (currentPath === '/analyze' || currentPath === '/result') activeIndex = 2;
  else if (currentPath === '/polish') activeIndex = 3;

  return (
    <div className="w-full bg-background/80 backdrop-blur-md border-b z-50 relative">
      <div className="container mx-auto px-4 py-4">
        <div className="relative flex items-start justify-between max-w-3xl mx-auto">
          
          {/* Progress Line Background */}
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-secondary -z-10" />
          
          {/* Active Progress Line */}
          <motion.div 
            className="absolute left-0 top-4 h-0.5 bg-primary -z-10"
            initial={{ width: '0%' }}
            animate={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />

          {STEPS.map((step, index) => {
            const isActive = index === activeIndex;
            const isCompleted = index < activeIndex;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2 px-2">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isActive || isCompleted ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                    scale: isActive ? 1.1 : 1,
                    borderColor: isActive || isCompleted ? "hsl(var(--primary))" : "hsl(var(--border))",
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 relative z-10",
                    (isActive || isCompleted) ? "border-primary text-primary-foreground" : "border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </motion.div>
                <span className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
