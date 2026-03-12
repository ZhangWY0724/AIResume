import { type ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ANNOUNCEMENT_VERSION = '20260312';
const ANNOUNCEMENT_STORAGE_KEY = `home_announcement_seen_${ANNOUNCEMENT_VERSION}`;

const announcementContent = {
  badge: '站点公告',
  title: '模型使用说明',
  date: '2026 年 3 月 12 日',
  paragraphs: [
    'GPT-5.2 与 Kilo 模型均接入自公益站点，服务可能存在波动或临时不可用的情况。',
    <>
      如您愿意捐赠模型资源，可联系
      <a
        href="https://qm.qq.com/q/qSWb8b1qJa"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-1 font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        站长
      </a>
      。
    </>,
    '使用过程中如有问题、建议或体验反馈，欢迎随时交流。'
  ]
};

const paragraphKeys = ['stability', 'donation', 'feedback'] as const;

export default function HomeAnnouncement() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeen, setHasSeen] = useState(true);

  useEffect(() => {
    const seen = window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) === 'true';
    setHasSeen(seen);

    if (!seen) {
      const timer = window.setTimeout(() => {
        setIsOpen(true);
        window.localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, 'true');
        setHasSeen(true);
      }, 500);

      return () => window.clearTimeout(timer);
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    window.localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, 'true');
    setHasSeen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="absolute top-5 right-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-lg shadow-slate-200/60 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
        title="查看公告"
      >
        <span className="relative inline-flex">
          <Bell className="h-4 w-4" />
          {!hasSeen && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </span>
        <span className="hidden sm:inline">公告</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-30 flex items-center justify-center px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-sm pointer-events-auto"
            >
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/12">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>{announcementContent.badge}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    title="关闭"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-4 py-3.5">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold leading-tight text-slate-900">
                      {announcementContent.title}
                    </h2>
                    <p className="text-xs font-medium text-slate-500">
                      发布时间 {announcementContent.date}
                    </p>
                  </div>

                  <div className="mt-3 space-y-3 text-[13px] leading-6 text-slate-700">
                    {announcementContent.paragraphs.map((paragraph, index) => (
                      <p key={paragraphKeys[index]}>{paragraph as ReactNode}</p>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={handleClose}
                    className={cn(
                      'rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors',
                      'hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    关闭
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md bg-blue-600 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    我知道了
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
