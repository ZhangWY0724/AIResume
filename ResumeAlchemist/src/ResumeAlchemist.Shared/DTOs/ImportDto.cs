namespace ResumeAlchemist.Shared.DTOs;

/// <summary>
/// 简历导入响应
/// </summary>
public class ImportResponse
{
    /// <summary>
    /// 是否成功
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// 解析出的文本内容
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// 文件名
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// 文件类型 (pdf/docx/txt)
    /// </summary>
    public string FileType { get; set; } = string.Empty;

    /// <summary>
    /// 错误信息（如果失败）
    /// </summary>
    public string? ErrorMessage { get; set; }
}
