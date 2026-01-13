using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// PDF 导出服务接口
/// </summary>
public interface IPdfExportService
{
    /// <summary>
    /// 将 Markdown 内容生成为 PDF 字节数组
    /// </summary>
    /// <param name="request">导出请求</param>
    /// <returns>PDF 文件字节数组</returns>
    byte[] GeneratePdf(PdfExportRequest request);
}
