namespace ResumeAlchemist.Shared.DTOs;

/// <summary>
/// 简历导出请求
/// </summary>
public class ExportRequest
{
    /// <summary>
    /// 简历内容
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// 模板ID
    /// </summary>
    public string TemplateId { get; set; } = "modern";

    /// <summary>
    /// 导出格式 (pdf/docx)
    /// </summary>
    public string Format { get; set; } = "pdf";
}

/// <summary>
/// 简历导出响应
/// </summary>
public class ExportResponse
{
    /// <summary>
    /// 是否成功
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// 文件的 Base64 编码
    /// </summary>
    public string FileBase64 { get; set; } = string.Empty;

    /// <summary>
    /// 文件名
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// 文件 MIME 类型
    /// </summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// 错误信息（如果失败）
    /// </summary>
    public string? ErrorMessage { get; set; }
}
