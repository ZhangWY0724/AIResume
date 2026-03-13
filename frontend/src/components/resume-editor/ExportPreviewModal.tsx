import { Download, Loader2, Printer, X } from 'lucide-react';
import type { ResumeExportPage } from '@/lib/resume-editor/export';
import { cn } from '@/lib/utils';

type ExportPreviewModalProps = {
  open: boolean;
  loading: boolean;
  pages: ResumeExportPage[];
  error: string | null;
  onClose: () => void;
  onDownloadPdf: () => void;
  onPrint: () => void;
};

export function ExportPreviewModal({
  open,
  loading,
  pages,
  error,
  onClose,
  onDownloadPdf,
  onPrint,
}: ExportPreviewModalProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex h-[92vh] w-full max-w-7xl overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.28)]">
          <div className="w-[320px] shrink-0 border-r border-slate-200 bg-slate-50 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Export Preview</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">导出预览</h2>
                <p className="mt-2 text-sm text-slate-500">预览、PDF 下载和打印都基于同一份页面快照，确保和模板显示保持一致。</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">页面统计</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{pages.length || 0}</p>
              <p className="mt-1 text-xs text-slate-500">A4 页面</p>
            </div>

            <div className="mt-4 space-y-3">
              <button
                onClick={onDownloadPdf}
                disabled={loading || pages.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                下载 PDF
              </button>
              <button
                onClick={onPrint}
                disabled={loading || pages.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                打印
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,_#e5e7eb_0%,_#dbe4f0_100%)] p-6">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" />
                  <p className="mt-4 text-base font-medium text-slate-700">正在生成导出预览</p>
                  <p className="mt-2 text-sm text-slate-500">会按 A4 进行切页，结果将和最终导出保持一致。</p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-6">
                {pages.map((page, index) => (
                  <div key={`${page.dataUrl.slice(0, 32)}-${index}`} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Page {index + 1}</span>
                    </div>
                    <div className={cn('overflow-hidden rounded-[20px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]')}>
                      <img src={page.dataUrl} alt={`resume-export-page-${index + 1}`} className="block h-auto w-full" />
                    </div>
                  </div>
                ))}
                {!loading && pages.length === 0 && !error && (
                  <div className="flex h-[60vh] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/60">
                    <p className="text-sm text-slate-500">暂无可预览页面。</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
