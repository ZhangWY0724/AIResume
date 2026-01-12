import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, ChevronRight, Download, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResumeStore } from '@/store/useResumeStore';
import { resumeApi, AnalyzeResponse } from '@/lib/api';
import RadarChart from '@/components/RadarChart';
import { cn } from '@/lib/utils';

export default function AnalysisResult() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const { resumeContent, selectedIndustry } = useResumeStore();
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    const analyzeResume = async () => {
      if (!resumeContent || !selectedIndustry) {
        navigate('/upload');
        return;
      }

      if (initialized.current) return;
      initialized.current = true;

      try {
        setLoading(true);
        setError(null);
        const response = await resumeApi.analyze({
          content: resumeContent,
          industryId: selectedIndustry,
        });
        setResult(response);
      } catch (err: any) {
        setError(err.response?.data?.message || '分析失败，请重试');
        console.error('分析失败:', err);
      } finally {
        setLoading(false);
      }
    };

    analyzeResume();
  }, [resumeContent, selectedIndustry, navigate]);

  if (!resumeContent && !loading) {
    navigate('/upload');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold mb-2 animate-pulse">AI 正在深度分析您的简历...</h2>
        <p className="text-muted-foreground text-center max-w-md">
          正在评估六维能力模型、扫描关键词匹配度、检测 ATS 友好度...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">分析失败</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <button
          onClick={() => navigate('/upload')}
          className="px-6 py-2 rounded-full bg-primary text-primary-foreground hover:shadow-lg transition-all"
        >
          返回重试
        </button>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl animate-in fade-in duration-700">
      
      {/* Top Section: Score & Comment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Score Card */}
        <div className="lg:col-span-1 bg-card border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 bg-primary/5 -z-10 rounded-2xl" />
          <h3 className="text-lg font-medium text-muted-foreground mb-4">综合评分</h3>
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-muted/50 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
              <motion.circle 
                className={cn("stroke-current", 
                  result.score >= 80 ? "text-green-500" : result.score >= 60 ? "text-yellow-500" : "text-destructive"
                )} 
                strokeWidth="8" 
                strokeLinecap="round" 
                cx="50" cy="50" r="40" 
                fill="transparent" 
                strokeDasharray="251.2" 
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 * (1 - result.score / 100) }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold tracking-tighter">{result.score}</span>
              <span className="text-sm text-muted-foreground mt-1">/ 100</span>
            </div>
          </div>
          <div className="mt-6 w-full">
            <div className="flex justify-between text-sm mb-2 items-center">
              <div className="flex items-center gap-1.5 text-muted-foreground group relative cursor-help">
                <span>ATS 友好度</span>
                <HelpCircle className="w-3.5 h-3.5" />
                {/* Custom Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-popover text-popover-foreground text-xs rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center leading-relaxed">
                  ATS (招聘管理系统) 友好度：<br/>
                  反映您的简历是否容易被大厂的自动筛选软件正确解析。
                </div>
              </div>
              <span className="font-medium">{result.atsScore}%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <motion.div
                className="bg-blue-500 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${result.atsScore}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* AI Comment & Radar */}
        <div className="lg:col-span-2 bg-card border rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">AI 专家点评</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              {result.comment}
            </p>
          </div>
          <div className="flex items-center justify-center bg-secondary/20 rounded-xl p-2">
            <RadarChart data={result.dimensions} />
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {/* Highlights */}
        <div className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-semibold">简历亮点</h3>
          </div>
          <ul className="space-y-3">
            {result.strengths.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4 text-orange-500">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-semibold">待改进</h3>
          </div>
          <ul className="space-y-3">
            {result.improvements.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Missing Keywords */}
        <div className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4 text-blue-500">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold">缺失关键词</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.missingKeywords.map((keyword, i) => (
              <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-sm font-medium">
                {keyword}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            * 补充这些行业关键词可显著提升简历筛选通过率
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button 
          onClick={() => navigate('/upload')}
          className="px-6 py-2 rounded-full border hover:bg-secondary transition-colors text-sm font-medium"
        >
          重新上传
        </button>
        <button 
          onClick={() => console.log("Export report")}
          className="px-6 py-2 rounded-full border flex items-center gap-2 hover:bg-secondary transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          下载报告
        </button>
        <button 
          onClick={() => navigate('/polish')}
          className="px-8 py-2 rounded-full bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 transition-all text-sm font-medium flex items-center gap-2"
        >
          一键 AI 润色
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
