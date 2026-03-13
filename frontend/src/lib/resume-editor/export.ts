import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const EXPORT_SCALE = 2.5;

export type ResumeExportPage = {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
};

function waitForImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(
    images.map((image) => (
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.onload = () => resolve();
            image.onerror = () => resolve();
          })
    )),
  ).then(() => undefined);
}

function createSliceCanvas(source: HTMLCanvasElement, offsetY: number, sliceHeight: number): HTMLCanvasElement {
  const sliceCanvas = document.createElement('canvas');
  sliceCanvas.width = source.width;
  sliceCanvas.height = sliceHeight;

  const context = sliceCanvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建导出切片画布');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
  context.drawImage(
    source,
    0,
    offsetY,
    source.width,
    sliceHeight,
    0,
    0,
    source.width,
    sliceHeight,
  );

  return sliceCanvas;
}

export async function createResumeExportPages(container: HTMLElement): Promise<ResumeExportPage[]> {
  await waitForImages(container);

  const canvas = await toCanvas(container, {
    pixelRatio: EXPORT_SCALE,
    cacheBust: true,
    backgroundColor: '#ffffff',
    skipAutoScale: true,
    filter: (node) => !node.classList?.contains('resume-editor-interactive-label'),
  });

  const pageHeightPx = Math.round(canvas.width * (A4_HEIGHT_MM / A4_WIDTH_MM));
  const pages: ResumeExportPage[] = [];

  for (let offsetY = 0; offsetY < canvas.height; offsetY += pageHeightPx) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetY);
    const sliceCanvas = createSliceCanvas(canvas, offsetY, sliceHeight);

    pages.push({
      dataUrl: sliceCanvas.toDataURL('image/png', 1),
      widthPx: sliceCanvas.width,
      heightPx: sliceCanvas.height,
    });
  }

  return pages;
}

export function downloadResumePdf(pages: ResumeExportPage[], fileName: string): void {
  if (pages.length === 0) {
    throw new Error('没有可导出的页面');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage('a4', 'portrait');
    }

    const pageHeightMm = (page.heightPx / page.widthPx) * A4_WIDTH_MM;
    pdf.addImage(page.dataUrl, 'PNG', 0, 0, A4_WIDTH_MM, pageHeightMm, undefined, 'FAST');
  });

  pdf.save(fileName);
}

export function printResumePages(pages: ResumeExportPage[]): void {
  if (pages.length === 0) {
    throw new Error('没有可打印的页面');
  }

  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    throw new Error('浏览器拦截了打印窗口，请允许弹窗后重试');
  }

  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <title>Resume Export</title>
        <style>
          @page { size: A4; margin: 0; }
          html, body { margin: 0; padding: 0; background: #f3f4f6; }
          body { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0; }
          img { display: block; width: 210mm; max-width: 210mm; background: #fff; }
          @media print {
            html, body { background: #fff; }
            body { display: block; padding: 0; }
            .page { break-after: page; page-break-after: always; }
            .page:last-child { break-after: auto; page-break-after: auto; }
            img { width: 210mm; max-width: 210mm; }
          }
        </style>
      </head>
      <body>
        ${pages.map((page) => `<div class="page"><img src="${page.dataUrl}" alt="resume-page" /></div>`).join('')}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.focus();
              window.print();
            }, 100);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
