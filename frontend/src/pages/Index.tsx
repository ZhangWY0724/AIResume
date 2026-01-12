import { motion } from 'framer-motion';
import { INDUSTRIES } from '@/lib/constants';
import { useResumeStore } from '@/store/useResumeStore';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const { setSelectedIndustry } = useResumeStore();
  const navigate = useNavigate();

  const handleSelectIndustry = (id: string) => {
    setSelectedIndustry(id);
    navigate('/upload');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[100px] rounded-full pointer-events-none opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12 relative z-10"
      >
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
          AI简历分析
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          AI 智能驱动的简历优化专家。选择您的目标领域，让简历脱颖而出。
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full relative z-10">
        {INDUSTRIES.map((industry, index) => (
          <motion.div
            key={industry.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectIndustry(industry.id)}
            className={cn(
              "group cursor-pointer rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50 relative overflow-hidden"
            )}
          >
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity", industry.bgColor)} />
            
            <div className="flex items-start justify-between mb-4">
              <div className={cn("p-3 rounded-lg bg-secondary group-hover:bg-background transition-colors", industry.color)}>
                <industry.icon className="w-8 h-8" />
              </div>
            </div>
            
            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
              {industry.name}
            </h3>
            <p className="text-muted-foreground text-sm">
              {industry.description}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 text-sm text-muted-foreground"
      >
        Powered by AI GLM-4 Model
      </motion.div>
    </div>
  );
}
