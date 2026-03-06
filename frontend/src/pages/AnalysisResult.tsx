import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, ChevronRight, HelpCircle, MessageSquare, Target, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResumeStore, hashContent } from '@/store/useResumeStore';
import { resumeApi, AnalyzeResponse, SseErrorData, RateLimitError } from '@/lib/api';
import RadarChart from '@/components/RadarChart';
import { cn } from '@/lib/utils';
import { ErrorDisplay } from '@/components/ErrorDisplay';

export default function AnalysisResult() {
  const {
    resumeContent,
    selectedIndustry,
    selectedModel,
    analysisResult,
    analysisContentHash,
    setAnalysisResult,
    interviewResult,
    setInterviewResult,
    clearAnalysisCache
  } = useResumeStore();

  // 计算当前内容的哈希值，判断是否有有效缓存
  const currentHash = resumeContent && selectedIndustry
    ? hashContent(resumeContent, selectedIndustry, selectedModel)
    : null;
  const hasCachedResult = analysisResult && analysisContentHash === currentHash;

  const [loading, setLoading] = useState(!hasCachedResult);
  const [error, setError] = useState<SseErrorData | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(hasCachedResult ? analysisResult : null);

  // Interview prediction state
  const [loadingInterview, setLoadingInterview] = useState(false);
  const [interviewError, setInterviewError] = useState<SseErrorData | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [expandedImprovement, setExpandedImprovement] = useState<number | null>(null);

  const navigate = useNavigate();
  const requestStartedRef = useRef(false);
  const interviewAbortControllerRef = useRef<AbortController | null>(null);

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

    // 清除旧的面试预测结果（因为简历内容已变化）
    setInterviewResult(null);

    setLoading(true);
    setError(null);

    resumeApi.analyze({
      content: resumeContent,
      industryId: selectedIndustry,
      modelType: selectedModel,
    })
      .then((response) => {
        console.log('[AnalysisResult] 分析完成:', response);
        setResult(response);
        if (currentHash) {
          setAnalysisResult(response, currentHash);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('[AnalysisResult] 分析失败:', err);
        if (err instanceof RateLimitError) {
          setError({
            message: err.message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfterSeconds: err.retryAfterSeconds,
          });
        } else {
          setError({
            message: err?.response?.data?.message || err?.message || '分析失败，请重试',
            code: 'HTTP_ERROR',
          });
        }
        setLoading(false);
        requestStartedRef.current = false; // 允许重试
      });

    // 不在 cleanup 中取消请求，让请求完成
  }, [resumeContent, selectedIndustry, selectedModel, navigate, result, hasCachedResult, analysisResult, currentHash, setAnalysisResult, setInterviewResult]);

  // 组件卸载时取消面试预测请求
  useEffect(() => {
    return () => {
      if (interviewAbortControllerRef.current) {
        interviewAbortControllerRef.current.abort();
        interviewAbortControllerRef.current = null;
      }
    };
  }, []);

  // 手动触发面试预测
  const handleGenerateInterview = () => {
    if (!resumeContent) return;

    setLoadingInterview(true);
    setInterviewError(null);

    // 创建 AbortController 用于取消请求
    const abortController = new AbortController();
    interviewAbortControllerRef.current = abortController;

    resumeApi.predictInterview({
      resumeContent,
      industryId: selectedIndustry || 'general',
      modelType: selectedModel,
    }, abortController.signal)
    .then(res => {
      if (abortController.signal.aborted) return;
      setInterviewResult(res);
    })
    .catch(err => {
      if (err.name === 'CanceledError' || abortController.signal.aborted) return;

      if (err instanceof RateLimitError) {
        setInterviewError({
          message: err.message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: err.retryAfterSeconds,
        });
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setInterviewError({
          message: 'AI 生成面试问题需要较长时间，请稍后重试',
          code: 'TIMEOUT_ERROR',
        });
      } else {
        setInterviewError({
          message: err.message || '面试预测失败，请重试',
          code: 'UNKNOWN_ERROR',
        });
      }
    })
    .finally(() => {
      if (!abortController.signal.aborted) {
        setLoadingInterview(false);
      }
    });
  };

  if (!resumeContent && !loading) {
    navigate('/upload');
    return null;
  }

  const loadingStages = [
    '解析简历结构',
    '评估六维能力',
    '生成优化建议'
  ];

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl space-y-5">
          <div className="rounded-3xl border bg-card p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative h-10 w-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">AI 正在分析您的简历</h2>
            </div>
            <p className="text-muted-foreground">
              已进入深度诊断阶段，将为您输出评分、亮点、改进建议与关键词优化方向。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
              {loadingStages.map((stage, index) => (
                <div
                  key={stage}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm flex items-center gap-2",
                    index === 0 ? "border-primary/30 bg-primary/5" : "bg-muted/30"
                  )}
                >
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    index === 0 ? "bg-primary animate-pulse" : "bg-muted-foreground/40"
                  )} />
                  <span className={index === 0 ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {stage}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 rounded-3xl border bg-card p-5 animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-4" />
              <div className="h-28 w-28 mx-auto bg-muted rounded-full" />
              <div className="h-3 w-24 mx-auto bg-muted rounded mt-4" />
            </div>
            <div className="md:col-span-1 rounded-3xl border bg-card p-5 animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-4" />
              <div className="h-36 bg-muted rounded-2xl" />
            </div>
            <div className="md:col-span-2 rounded-3xl border bg-card p-5 animate-pulse">
              <div className="h-5 w-32 bg-muted rounded mb-5" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-11/12 bg-muted rounded" />
                <div className="h-4 w-4/5 bg-muted rounded" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span>预计还需几秒，请稍候...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <ErrorDisplay
          error={error}
          size="lg"
          onRetry={() => {
            setError(null);
            requestStartedRef.current = false;
            clearAnalysisCache();
            navigate('/upload');
          }}
          retryText="返回重试"
        />
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const industryFitScore = Math.max(0, Math.min(100, result.industryFitScore ?? result.atsScore));

    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-700 space-y-8">

        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h1 className="text-3xl font-bold tracking-tight">分析报告</h1>
             <p className="text-xs text-muted-foreground mt-1">
               免责声明：AI 分析结果受模型能力影响，仅供参考，请结合实际情况进行判断与完善。
             </p>
          </div>
          <div className="flex gap-3">
              <button
                onClick={() => {
                  clearAnalysisCache();
                  navigate('/upload');
                }}
                className="px-4 py-2 rounded-full border hover:bg-secondary transition-colors text-sm font-medium"
              >
                重新上传
              </button>
              <button
                onClick={() => navigate('/polish')}
                className="px-6 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all text-sm font-medium flex items-center gap-2"
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

                  <div className="flex items-center justify-between mb-2 mt-4">
                      <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">目标行业匹配度</span>
                          <div className="group relative cursor-help">
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-popover text-popover-foreground text-xs rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                  评分越高，说明简历内容与您选择行业的招聘要求越贴近。
                              </div>
                          </div>
                      </div>
                      <span className="font-bold text-primary">{industryFitScore}%</span>
                  </div>
                  <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                      <motion.div
                          className={cn("h-full rounded-full",
                              industryFitScore >= 80 ? "bg-green-500" : industryFitScore >= 60 ? "bg-yellow-500" : "bg-orange-500"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${industryFitScore}%` }}
                          transition={{ duration: 1, delay: 0.6 }}
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
                                                  className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
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
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
                 <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
               </div>
               <div>
                 <h3 className="text-2xl font-bold">AI 面试官追问</h3>
                 <p className="text-muted-foreground">基于您的简历内容，预测面试官最感兴趣的 6 个问题</p>
               </div>
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
              <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                  <div className="relative w-20 h-20 mb-6">
                      {/* 旋转的外圈 */}
                      <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-800" />
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
                      {/* 中心图标 */}
                      <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />
                      </div>
                  </div>
                  <h4 className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-2">AI 正在分析...</h4>
                  <p className="text-muted-foreground text-sm">正在根据您的简历生成面试问题</p>
              </div>
          ) : interviewError ? (
              <div className="py-8">
                <ErrorDisplay
                  error={interviewError}
                  size="sm"
                  onRetry={handleGenerateInterview}
                  retryText="重新生成"
                />
              </div>
          ) : interviewResult ? (
              <motion.div
                  className="space-y-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                      hidden: { opacity: 0 },
                      visible: {
                          opacity: 1,
                          transition: { staggerChildren: 0.12 }
                      }
                  }}
              >
                  {interviewResult.questions.map((q, i) => (
                      <motion.div
                          key={i}
                          variants={{
                              hidden: { opacity: 0, y: 20 },
                              visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
                          }}
                          className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all group"
                      >
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
                      </motion.div>
                  ))}
              </motion.div>
          ) : (
              /* 初始状态：显示生成按钮 */
              <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-950/20 rounded-2xl border border-dashed border-purple-200 dark:border-purple-800">
                  <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6">
                      <MessageSquare className="w-10 h-10 text-purple-500" />
                  </div>
                  <h4 className="text-xl font-bold mb-2">预测面试问题</h4>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                      AI 将根据您的简历内容，预测面试官可能会问的 6 个问题，并提供回答建议
                  </p>
                  <button
                    onClick={handleGenerateInterview}
                    className="flex items-center gap-2 px-8 py-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                  >
                    <Sparkles className="w-5 h-5" />
                    生成面试问题
                  </button>
              </div>
          )}
        </div>
      </div>
    );
  }
