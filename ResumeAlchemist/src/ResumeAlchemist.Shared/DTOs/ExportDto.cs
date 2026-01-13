namespace ResumeAlchemist.Shared.DTOs;

/// <summary>
/// 简历导出请求
/// </summary>
public class ExportRequest
{
    /// <summary>
    /// 简历内容（Markdown格式）
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// 模板ID（预留扩展）
    /// </summary>
    public string TemplateId { get; set; } = "professional";
}

/// <summary>
/// PDF导出请求
/// </summary>
public class PdfExportRequest
{
    /// <summary>
    /// 简历内容（Markdown格式）
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// 模板ID
    /// </summary>
    public string TemplateId { get; set; } = "professional";

    /// <summary>
    /// 文件名（不含扩展名）
    /// </summary>
    public string FileName { get; set; } = "简历";
}
