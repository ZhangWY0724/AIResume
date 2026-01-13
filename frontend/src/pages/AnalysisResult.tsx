import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, ChevronRight, HelpCircle, MessageSquare, Target, Lightbulb, ChevronDown, ChevronUp, Clock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResumeStore, hashContent } from '@/store/useResumeStore';
import { resumeApi, AnalyzeResponse, SseProgressData, SseErrorData, RateLimitError } from '@/lib/api';
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
  const [error, setError] = useState<SseErrorData | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(hasCachedResult ? analysisResult : null);
  const [progress, setProgress] = useState<SseProgressData | null>(null);
  
  // Interview prediction state
  const [loadingInterview, setLoadingInterview] = useState(false);
  const [interviewError, setInterviewError] = useState<{ message: string; isRateLimit?: boolean; isTimeout?: boolean } | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [expandedImprovement, setExpandedImprovement] = useState<number | null>(null);

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
          setError(err);
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
      setInterviewError(null);

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

        // 判断错误类型
        if (err instanceof RateLimitError) {
          setInterviewError({
            message: err.message,
            isRateLimit: true
          });
        } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          setInterviewError({
            message: 'AI 生成面试问题需要较长时间，请稍后重试',
            isTimeout: true
          });
        } else {
          setInterviewError({
            message: err.message || '面试预测失败，请重试'
          });
        }
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
    const isRateLimitError = error.code === 'RATE_LIMIT_EXCEEDED';

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
        {isRateLimitError ? (
          <>
            <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-6">
              <Clock className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-orange-600 dark:text-orange-400">请求过于频繁</h2>
            <p className="text-muted-foreground mb-2 text-center max-w-md">{error.message}</p>
            {error.retryAfterSeconds && (
              <p className="text-sm text-muted-foreground mb-6">
                建议等待 <span className="font-bold text-orange-500">{error.retryAfterSeconds}</span> 秒后重试
              </p>
            )}
          </>
        ) : (
          <>
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">分析失败</h2>
            <p className="text-muted-foreground mb-6">{error.message}</p>
          </>
        )}
        <button
          onClick={() => {
            setError(null);
            requestStartedRef.current = false;
            navigate('/upload');
          }}
          className={cn(
            "px-6 py-2 rounded-full text-white hover:shadow-lg transition-all",
            isRateLimitError
              ? "bg-orange-500 hover:bg-orange-600"
              : "bg-primary text-primary-foreground"
          )}
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
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-700 space-y-8">
        
        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h1 className="text-3xl font-bold tracking-tight">分析报告</h1>
             <p className="text-muted-foreground mt-1">AI 全维度诊断完成，为您生成专属优化方案</p>
          </div>
          <div className="flex gap-3">
              <button 
                onClick={() => navigate('/upload')}
                className="px-4 py-2 rounded-full border hover:bg-secondary transition-colors text-sm font-medium"
              >
                重新上传
              </button>
              <button 
                onClick={() => navigate('/polish')}
                className="px-6 py-2 rounded-full bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 transition-all text-sm font-medium flex items-center gap-2"
              >
                一键 AI 润色
                <ChevronRight className="w-4 h-4" />
              </button>
          </div>
        </div>
  
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-min">
          
          {/* 1. 核心评分 (Score) - 左上 - 占 1 列 */}
          <div className="md:col-span-1 bg-card border rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[280px] group hover:border-primary/20 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
              
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 z-10">综合评分</h3>
              
              <div className="relative w-40 h-40 flex items-center justify-center z-10">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle className="text-muted/20 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                    <motion.circle 
                      className={cn("stroke-current drop-shadow-md", 
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
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full mt-1", 
                        result.score >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : 
                        result.score >= 60 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : 
                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {result.score >= 80 ? "优秀" : result.score >= 60 ? "良好" : "需改进"}
                    </span>
                  </div>
              </div>
              
              <p className="text-xs text-center text-muted-foreground mt-4 max-w-[80%] z-10">
                  击败了 {Math.max(10, Math.floor(result.score * 0.95))}% 的求职者
              </p>
          </div>
  
          {/* 2. 雷达图 (Radar) - 中间 - 占 1 列 */}
          <div className="md:col-span-1 bg-card border rounded-3xl p-4 shadow-sm flex flex-col items-center justify-center min-h-[280px] hover:border-primary/20 transition-colors">
              <div className="w-full flex justify-between items-center mb-2 px-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">能力模型</h3>
                  <HelpCircle className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="w-full flex-1 flex items-center justify-center">
                  <RadarChart data={result.dimensions} />
              </div>
          </div>
  
          {/* 3. 点评与 ATS (Review) - 右侧 - 占 2 列 */}
          <div className="md:col-span-2 bg-card border rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[280px] hover:border-primary/20 transition-colors">
              <div>
                  <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <Sparkles className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-lg">AI 专家诊断</h3>
                  </div>
                  <div className="relative pl-4 border-l-2 border-primary/30 py-1">
                      <p className="text-muted-foreground leading-relaxed italic">
                          "{result.comment}"
                      </p>
                  </div>
              </div>
  
              <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">ATS 机器筛选友好度</span>
                          <div className="group relative cursor-help">
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-popover text-popover-foreground text-xs rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                  指数越高，简历被大厂招聘系统(ATS)正确解析并推荐的概率越大。
                              </div>
                          </div>
                      </div>
                      <span className="font-bold text-primary">{result.atsScore}%</span>
                  </div>
                  <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                      <motion.div
                          className={cn("h-full rounded-full",
                              result.atsScore >= 80 ? "bg-green-500" : "bg-blue-500"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${result.atsScore}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                      />
                  </div>
              </div>
          </div>
  
                  {/* 4. 待改进 (Weaknesses) - 第二行左侧 - 占 2 列 */}
                  <div className="md:col-span-2 bg-card border rounded-3xl p-6 shadow-sm hover:border-orange-200 dark:hover:border-orange-900/50 transition-colors">
                       <div className="flex items-center gap-2 mb-5 text-orange-600 dark:text-orange-400">
                          <AlertTriangle className="w-5 h-5" />
                          <h3 className="font-bold text-lg">急需改进 (Top Priorities)</h3>
                       </div>
                       <div className="space-y-3">
                          {result.improvements.map((item, i) => (
                            <div key={i} className="rounded-xl border border-transparent bg-orange-50/50 dark:bg-orange-950/20 hover:border-orange-200 dark:hover:border-orange-800 transition-all overflow-hidden">
                              <button 
                                  onClick={() => setExpandedImprovement(expandedImprovement === i ? null : i)}
                                  className="w-full flex items-start gap-3 p-4 text-left cursor-pointer"
                              >
                                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                                  <span className="text-sm font-medium text-foreground/90 flex-1 leading-relaxed">
                                      {typeof item === 'string' ? item : item.problem}
                                  </span>
                                  {typeof item !== 'string' && (
                                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-0.5", expandedImprovement === i ? "rotate-180" : "")} />
                                  )}
                              </button>
          
                              {/* Comparison Content */}
                              {typeof item !== 'string' && (
                                  <motion.div 
                                      initial={false}
                                      animate={{ 
                                          height: expandedImprovement === i ? 'auto' : 0,
                                          opacity: expandedImprovement === i ? 1 : 0
                                      }}
                                      className="overflow-hidden"
                                  >
                                      <div className="px-4 pb-4 pt-0 space-y-3">
                                          <div className="grid gap-3 p-3 rounded-lg bg-background/50 border border-orange-100 dark:border-orange-900/30">
                                              {/* Before */}
                                              {item.original && item.original !== 'N/A' && (
                                                  <div className="flex gap-3 text-sm">
                                                      <span className="shrink-0 text-red-500 font-bold text-xs mt-0.5">❌ 原文</span>
                                                      <p className="text-muted-foreground line-through decoration-red-500/30 decoration-2 italic">
                                                          {item.original}
                                                      </p>
                                                  </div>
                                              )}
                                              
                                              {/* After */}
                                              <div className="flex gap-3 text-sm">
                                                  <span className="shrink-0 text-green-600 font-bold text-xs mt-0.5">✅ 建议</span>
                                                  <p className="text-foreground font-medium bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded -my-1">
                                                      {item.example}
                                                  </p>
                                              </div>
                                          </div>
                                          
                                          <div className="flex justify-end">
                                              <button 
                                                  onClick={() => navigate('/polish')}
                                                  className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline"
                                              >
                                                  去润色页面应用修改 <ChevronRight className="w-3 h-3" />
                                              </button>
                                          </div>
                                      </div>
                                  </motion.div>
                              )}
                            </div>
                          ))}
                       </div>
                  </div>  
          {/* 5. 亮点 (Strengths) - 第二行右侧 - 占 1 列 */}
          <div className="md:col-span-1 bg-card border rounded-3xl p-6 shadow-sm hover:border-green-200 dark:hover:border-green-900/50 transition-colors">
              <div className="flex items-center gap-2 mb-5 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="font-bold text-lg">亮点</h3>
              </div>
              <ul className="space-y-3">
                  {result.strengths.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
              </ul>
          </div>
  
          {/* 6. 缺失关键词 (Keywords) - 第二行最右 - 占 1 列 */}
          <div className="md:col-span-1 bg-card border rounded-3xl p-6 shadow-sm flex flex-col hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
              <div className="flex items-center gap-2 mb-5 text-blue-600 dark:text-blue-400">
                  <AlertCircle className="w-5 h-5" />
                  <h3 className="font-bold text-lg">建议补充</h3>
              </div>
              <div className="flex flex-wrap gap-2 content-start flex-1">
                  {result.missingKeywords.map((keyword, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-50/80 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-100 dark:border-blue-800">
                      + {keyword}
                    </span>
                  ))}
              </div>
               <p className="mt-4 text-[10px] text-muted-foreground text-center">
                  * 补充这些关键词可显著提升 ATS 匹配率
              </p>
          </div>
  
      </div>
  
        {/* 7. AI 面试预测 (Interview) - 独立区域，保持全宽 */}
        <div className="mt-8 pt-8 border-t">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
               <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
             </div>
             <div>
               <h3 className="text-2xl font-bold">AI 面试官追问</h3>
               <p className="text-muted-foreground">基于您的简历内容，预测面试官最感兴趣的 6 个问题</p>
             </div>
          </div>
  
          {/* Preparation Tips Section */}
          {interviewResult?.preparationTips && (
             <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/30 dark:to-background border border-purple-100 dark:border-purple-800 rounded-2xl flex gap-4 shadow-sm">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg h-fit">
                    <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-bold text-purple-900 dark:text-purple-300 text-base mb-2">综合面试准备建议</h4>
                  <p className="text-sm text-purple-800/80 dark:text-purple-300/80 leading-relaxed max-w-4xl">
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
          ) : interviewError ? (
              <div className="flex flex-col items-center justify-center py-12 bg-secondary/20 rounded-xl">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center mb-4",
                    interviewError.isRateLimit ? "bg-orange-100 dark:bg-orange-900/30" :
                    interviewError.isTimeout ? "bg-blue-100 dark:bg-blue-900/30" :
                    "bg-red-100 dark:bg-red-900/30"
                  )}>
                    {interviewError.isRateLimit ? (
                      <Clock className="w-8 h-8 text-orange-500" />
                    ) : interviewError.isTimeout ? (
                      <Clock className="w-8 h-8 text-blue-500" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    )}
                  </div>
                  <h4 className={cn(
                    "text-lg font-bold mb-2",
                    interviewError.isRateLimit ? "text-orange-600 dark:text-orange-400" :
                    interviewError.isTimeout ? "text-blue-600 dark:text-blue-400" :
                    "text-red-600 dark:text-red-400"
                  )}>
                    {interviewError.isRateLimit ? "请求过于频繁" :
                     interviewError.isTimeout ? "生成超时" :
                     "生成失败"}
                  </h4>
                  <p className="text-muted-foreground text-sm mb-4 text-center max-w-md">
                    {interviewError.message}
                  </p>
                  <button
                    onClick={() => {
                      setInterviewError(null);
                      interviewRequestStartedRef.current = false;
                      setLoadingInterview(true);
                      resumeApi.predictInterview({
                        resumeContent: resumeContent!,
                        industryId: selectedIndustry || 'general',
                      })
                      .then(res => {
                        setInterviewResult(res);
                      })
                      .catch(err => {
                        if (err instanceof RateLimitError) {
                          setInterviewError({ message: err.message, isRateLimit: true });
                        } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                          setInterviewError({ message: 'AI 生成面试问题需要较长时间，请稍后重试', isTimeout: true });
                        } else {
                          setInterviewError({ message: err.message || '面试预测失败，请重试' });
                        }
                      })
                      .finally(() => setLoadingInterview(false));
                    }}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-medium hover:shadow-lg transition-all",
                      interviewError.isRateLimit ? "bg-orange-500 hover:bg-orange-600" :
                      interviewError.isTimeout ? "bg-blue-500 hover:bg-blue-600" :
                      "bg-primary"
                    )}
                  >
                    <RefreshCw className="w-4 h-4" />
                    重新生成
                  </button>
              </div>
          ) : interviewResult ? (
              <div className="space-y-4">
                  {interviewResult.questions.map((q, i) => (
                      <div key={i} className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all group">
                          <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
                              <div className="flex-1 space-y-3 w-full">
                                  {/* Header: Tags */}
                                  <div className="flex flex-wrap items-center gap-2">
                                      <span className={cn(
                                          "text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5",
                                          (q.difficulty?.includes('High') || q.difficulty?.includes('高') || q.difficulty?.includes('困难')) ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800" :
                                          (q.difficulty?.includes('Medium') || q.difficulty?.includes('中')) ? "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800" :
                                          "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                      )}>
                                          {(q.difficulty?.includes('High') || q.difficulty?.includes('高') || q.difficulty?.includes('困难')) ? <AlertTriangle className="w-3 h-3" /> : 
                                           (q.difficulty?.includes('Medium') || q.difficulty?.includes('中')) ? <Target className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                          
                                          {(q.difficulty?.includes('High') || q.difficulty?.includes('高') || q.difficulty?.includes('困难')) ? '高难度' : 
                                           (q.difficulty?.includes('Medium') || q.difficulty?.includes('中')) ? '中等难度' : '基础题'}
                                      </span>
                                      <span className="text-xs font-medium text-muted-foreground px-2.5 py-1 bg-secondary rounded-md border border-transparent">
                                          {q.category}
                                      </span>
                                  </div>
  
                                  {/* Question */}
                                  <h4 className="text-lg font-bold text-foreground/90 leading-snug">
                                      {q.question}
                                  </h4>
                                  
                                  {/* Reason */}
                                  <div className="flex gap-3 text-sm text-muted-foreground bg-secondary/30 p-3.5 rounded-xl border border-transparent group-hover:border-border/50 transition-colors">
                                      <Target className="w-4 h-4 mt-0.5 shrink-0 text-purple-500" />
                                      <span>
                                          <span className="font-semibold text-foreground/70 mr-2">考察意图:</span>
                                          {q.reason}
                                      </span>
                                  </div>
                              </div>
  
                              {/* Action Button */}
                              <div className="shrink-0 pt-1 w-full md:w-auto">
                                  <button 
                                      onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                                      className={cn(
                                          "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all w-full md:w-auto border",
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
                                  marginTop: expandedQuestion === i ? 20 : 0
                              }}
                              className="overflow-hidden"
                          >
                              <div className="pt-5 border-t border-dashed">
                                  <div className="flex gap-4">
                                      <div className="shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm">
                                          <Sparkles className="w-5 h-5" />
                                      </div>
                                      <div className="space-y-2">
                                          <h5 className="text-sm font-bold text-foreground">AI 建议回答策略</h5>
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
      </div>
    );
  }
