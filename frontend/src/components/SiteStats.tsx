import { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';
import { Upload, BarChart3, Sparkles, Eye, Users } from 'lucide-react';
import { getStats, SiteStatsResponse } from '@/lib/api';

/**
 * 带动画的数字计数器
 */
function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (!isInView || value === 0) return;

        let startTime: number | null = null;

        const animate = (currentTime: number) => {
            if (startTime === null) startTime = currentTime;
            const elapsed = (currentTime - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(2, -10 * progress);
            setDisplayValue(Math.round(value * eased));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration, isInView]);

    return <span ref={ref}>{displayValue.toLocaleString()}</span>;
}

/**
 * 单个统计项 — 纯文本内联样式，与 Footer 版权文字风格一致
 */
function StatItem({ icon, label, value, busuanziId }: {
    icon: React.ReactNode;
    label: string;
    value?: number;
    busuanziId?: string;
}) {
    return (
        <span className="inline-flex items-center gap-1">
            <span className="text-slate-400">{icon}</span>
            <span>{label}</span>
            <span className="font-medium text-slate-600 tabular-nums">
                {busuanziId ? <span id={busuanziId} /> : <AnimatedCounter value={value ?? 0} />}
            </span>
        </span>
    );
}

/**
 * 网站使用统计 — 纯文本风格，与 Footer 其他元素融为一体
 */
export default function SiteStats() {
    const [stats, setStats] = useState<SiteStatsResponse | null>(null);

    useEffect(() => {
        getStats()
            .then(setStats)
            .catch(() => {
                setStats({ resumesUploaded: 0, resumesAnalyzed: 0, resumesPolished: 0 });
            });
    }, []);

    if (!stats) return null;

    const hasBusinessStats = stats.resumesUploaded + stats.resumesAnalyzed + stats.resumesPolished > 0;

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-slate-500">
            {hasBusinessStats && (
                <>
                    <StatItem icon={<Upload className="w-3.5 h-3.5" />} label="上传" value={stats.resumesUploaded} />
                    <StatItem icon={<BarChart3 className="w-3.5 h-3.5" />} label="分析" value={stats.resumesAnalyzed} />
                    <StatItem icon={<Sparkles className="w-3.5 h-3.5" />} label="润色" value={stats.resumesPolished} />
                    <span className="hidden md:inline text-slate-300">|</span>
                </>
            )}
            <StatItem icon={<Eye className="w-3.5 h-3.5" />} label="访问" busuanziId="busuanzi_value_site_pv" />
            <StatItem icon={<Users className="w-3.5 h-3.5" />} label="访客" busuanziId="busuanzi_value_site_uv" />
        </div>
    );
}
