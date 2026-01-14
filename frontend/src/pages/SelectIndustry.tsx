import { motion } from 'framer-motion';
import { ArrowLeft, Home } from 'lucide-react';
import { INDUSTRIES } from '@/lib/constants';
import { useResumeStore } from '@/store/useResumeStore';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function SelectIndustry() {
  const { setSelectedIndustry } = useResumeStore();
  const navigate = useNavigate();

  const handleSelectIndustry = (id: string) => {
    setSelectedIndustry(id);
    navigate('/upload');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between max-w-6xl">
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
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
          </div>

          <h1 className="font-semibold text-lg absolute left-1/2 -translate-x-1/2">
            选择行业
          </h1>

          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
            选择您的目标行业
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            我们将根据行业特点，为您提供针对性的简历优化建议
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                "group cursor-pointer rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-6 shadow-sm transition-all hover:shadow-xl hover:border-blue-400/50 relative overflow-hidden"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("p-3 rounded-lg bg-slate-50 group-hover:bg-blue-50 transition-colors shadow-sm ring-1 ring-slate-100", industry.color)}>
                  <industry.icon className="w-8 h-8 text-slate-700 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2 text-slate-800 group-hover:text-blue-600 transition-colors">
                {industry.name}
              </h3>
              <p className="text-slate-500 text-sm font-medium">
                {industry.description}
              </p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
