import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, ChevronRight, Download, HelpCircle, MessageSquare, Target, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResumeStore, hashContent } from '@/store/useResumeStore';
import { resumeApi, AnalyzeResponse, SseProgressData } from '@/lib/api';
import RadarChart from '@/components/RadarChart';
import { cn } from '@/lib/utils';

export default function AnalysisResult() {
  const {
    resumeContent,
    selectedIndustry,
    analysisResult,
    analysisContentHash,
    setAnalysisResult,
    interviewResult,
    setInterviewResult
  } = useResumeStore();

  // 计算当前内容的哈希值，判断是否有有效缓存
  const currentHash = resumeContent && selectedIndustry
    ? hashContent(resumeContent, selectedIndustry)
    : null;
  const hasCachedResult = analysisResult && analysisContentHash === currentHash;

  const [loading, setLoading] = useState(!hasCachedResult);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(hasCachedResult ? analysisResult : null);
  const [progress, setProgress] = useState<SseProgressData | null>(null);
  
  // Interview prediction state
  const [loadingInterview, setLoadingInterview] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const navigate = useNavigate();
  const requestStartedRef = useRef(false);
  const interviewRequestStartedRef = useRef(false);

  useEffect(() => {
    // 如果已经有本地结果，不重复发起
    if (result) {
      return;
    }

    if (!resumeContent || !selectedIndustry) {
      navigate('/upload');
      return;
    }

    // 检查是否有有效的缓存结果（双重检查）
    if (hasCachedResult && analysisResult) {
      console.log('[AnalysisResult] 使用缓存的分析结果');
      setResult(analysisResult);
      setLoading(false);
      return;
    }

    // 防止重复请求（包括 StrictMode 的双重渲染）
    if (requestStartedRef.current) {
      console.log('[AnalysisResult] 请求已在进行中，跳过');
      return;
    }

    console.log('[AnalysisResult] 开始发起分析请求');
    requestStartedRef.current = true;

    // 清除旧的面试预测结果，确保重新生成
    setInterviewResult(null);
    interviewRequestStartedRef.current = false; // 重置面试请求标志

    setLoading(true);
    setError(null);
    setProgress({ percentage: 0, stage: '准备中', message: '正在初始化...' });

    // 使用流式 API
    resumeApi.analyzeStream(
      {
        content: resumeContent,
        industryId: selectedIndustry,
      },
      {
        onProgress: (data) => {
          console.log('[AnalysisResult] 收到进度:', data);
          setProgress(data);
        },
        onComplete: (response) => {
          console.log('[AnalysisResult] 分析完成:', response);
          setResult(response);
          // 缓存分析结果到 store
          if (currentHash) {
            setAnalysisResult(response, currentHash);
          }
          setLoading(false);
          setProgress(null);
        },
        onError: (err) => {
          console.error('[AnalysisResult] 分析失败:', err);
          setError(err.message || '分析失败，请重试');
          setLoading(false);
          setProgress(null);
          requestStartedRef.current = false; // 允许重试
        },
      }
    );

    // 不在 cleanup 中取消请求，让请求完成
  }, [resumeContent, selectedIndustry, navigate, result, hasCachedResult, analysisResult, currentHash, setAnalysisResult]);

  // Effect to fetch interview prediction
  useEffect(() => {
    // Only fetch if analysis is done, we have content, and no existing interview result
    if (result && !interviewResult && !loadingInterview && resumeContent) {
      if (interviewRequestStartedRef.current) {
         return;
      }
      
      console.log('[AnalysisResult] 开始发起面试预测请求');
      interviewRequestStartedRef.current = true;
      setLoadingInterview(true);
      
      resumeApi.predictInterview({
        resumeContent,
        industryId: selectedIndustry || 'general',
        targetPosition: 'Based on resume' // Optional: could be parsed from resume or user input
      })
      .then(res => {
        console.log('[AnalysisResult] 面试预测完成:', res);
        setInterviewResult(res);
      })
      .catch(err => {
        console.error('[AnalysisResult] 面试预测失败:', err);
        interviewRequestStartedRef.current = false; // Allow retry on failure
        // We don't block the UI if this fails, just log it
      })
      .finally(() => {
        setLoadingInterview(false);
      });
    }
  }, [result, interviewResult, loadingInterview, resumeContent, selectedIndustry, setInterviewResult]);

  if (!resumeContent && !loading) {
    navigate('/upload');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
        <div className="relative w-32 h-32 mb-8">
          {/* 背景圆环 */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              className="text-muted/30 stroke-current"
              strokeWidth="6"
              cx="50" cy="50" r="42"
              fill="transparent"
            />
            <motion.circle
              className="text-primary stroke-current"
              strokeWidth="6"
              strokeLinecap="round"
              cx="50" cy="50" r="42"
              fill="transparent"
              strokeDasharray="263.9"
              initial={{ strokeDashoffset: 263.9 }}
              animate={{ strokeDashoffset: 263.9 * (1 - (progress?.percentage || 0) / 100) }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </svg>
          {/* 中心内容 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-primary">{progress?.percentage || 0}%</span>
          </div>
          {/* 外部光晕动画 */}
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{progress?.stage || 'AI 分析中'}</h2>
        <p className="text-muted-foreground text-center max-w-md mb-4">
          {progress?.message || '正在评估六维能力模型、扫描关键词匹配度、检测 ATS 友好度...'}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span>AI 深度分析中，请稍候...</span>
        </div>
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

      {/* AI Interview Predictor Section */}
      <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        <div className="flex items-center gap-2 mb-6">
           <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
             <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
           </div>
           <div>
             <h3 className="text-xl font-bold">AI 面试官追问</h3>
             <p className="text-sm text-muted-foreground">基于您的简历内容，预测面试官最感兴趣的 6 个问题</p>
           </div>
        </div>

        {/* Preparation Tips Section */}
        {interviewResult?.preparationTips && (
           <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-xl flex gap-3">
              <Lightbulb className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-300 text-sm mb-1">面试准备建议</h4>
                <p className="text-sm text-purple-800/80 dark:text-purple-300/80 leading-relaxed">
                   {interviewResult.preparationTips}
                </p>
              </div>
           </div>
        )}

        {loadingInterview ? (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-32 rounded-xl bg-card border shadow-sm animate-pulse flex flex-col justify-center p-6 gap-3">
                       <div className="flex gap-3 mb-2">
                           <div className="w-16 h-5 bg-muted/50 rounded-full" />
                           <div className="w-20 h-5 bg-muted/50 rounded-full" />
                       </div>
                       <div className="w-3/4 h-6 bg-muted/50 rounded" />
                       <div className="w-1/2 h-4 bg-muted/30 rounded" />
                    </div>
                ))}
            </div>
        ) : interviewResult ? (
            <div className="space-y-4">
                {interviewResult.questions.map((q, i) => (
                    <div key={i} className="bg-card border rounded-xl p-5 shadow-sm hover:border-purple-200 dark:hover:border-purple-800 transition-all group">
                        <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
                            <div className="flex-1 space-y-3 w-full">
                                {/* Header: Tags */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={cn(
                                        "text-xs font-medium px-2.5 py-0.5 rounded-full border flex items-center gap-1",
                                        (q.difficulty?.includes('High') || q.difficulty?.includes('高') || q.difficulty?.includes('困难')) ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800" :
                                        (q.difficulty?.includes('Medium') || q.difficulty?.includes('中')) ? "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800" :
                                        "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                    )}>
                                        {(q.difficulty?.includes('High') || q.difficulty?.includes('高') || q.difficulty?.includes('困难')) ? '⚡ 高难度' : 
                                         (q.difficulty?.includes('Medium') || q.difficulty?.includes('中')) ? '⚖️ 中等难度' : '🌱 基础题'}
                                    </span>
                                    <span className="text-xs text-muted-foreground px-2.5 py-0.5 bg-secondary rounded-full border border-transparent">
                                        {q.category}
                                    </span>
                                </div>

                                {/* Question */}
                                <h4 className="text-lg font-semibold text-foreground/90 leading-snug">
                                    {q.question}
                                </h4>
                                
                                {/* Reason */}
                                <div className="flex gap-2 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg border border-transparent group-hover:border-border/50 transition-colors">
                                    <Target className="w-4 h-4 mt-0.5 shrink-0 text-purple-500" />
                                    <span>
                                        <span className="font-medium text-foreground/70 mr-1">考察意图:</span>
                                        {q.reason}
                                    </span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="shrink-0 pt-1 w-full md:w-auto">
                                <button 
                                    onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all w-full md:w-auto border",
                                        expandedQuestion === i 
                                            ? "bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300 shadow-inner"
                                            : "bg-background border-border hover:bg-secondary text-foreground hover:border-secondary-foreground/20"
                                    )}
                                >
                                    <Lightbulb className={cn("w-4 h-4", expandedQuestion === i ? "fill-current" : "")} />
                                    {expandedQuestion === i ? "收起思路" : "查看思路"}
                                    {expandedQuestion === i ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                                </button>
                            </div>
                        </div>

                        {/* Expandable Tips */}
                        <motion.div 
                            initial={false}
                            animate={{ 
                                height: expandedQuestion === i ? 'auto' : 0,
                                opacity: expandedQuestion === i ? 1 : 0,
                                marginTop: expandedQuestion === i ? 16 : 0
                            }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 border-t border-dashed">
                                <div className="flex gap-3">
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <h5 className="text-sm font-medium text-foreground">AI 回答建议</h5>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {q.tips}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-8 text-muted-foreground bg-secondary/20 rounded-xl">
                未能生成面试预测
            </div>
        )}
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
