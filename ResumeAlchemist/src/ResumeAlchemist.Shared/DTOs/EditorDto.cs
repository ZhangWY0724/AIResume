namespace ResumeAlchemist.Shared.DTOs;

/// <summary>
/// 简历编辑器结构化请求
/// </summary>
public class StructureResumeEditorRequest
{
    /// <summary>
    /// 原始简历文本
    /// </summary>
    public string RawText { get; set; } = string.Empty;

    /// <summary>
    /// AI 润色后的简历文本
    /// </summary>
    public string? PolishedText { get; set; }
}

/// <summary>
/// 创建编辑器草稿请求
/// </summary>
public class CreateResumeEditorDraftRequest
{
    /// <summary>
    /// 草稿内容
    /// </summary>
    public ResumeEditorDraft Draft { get; set; } = new();
}

/// <summary>
/// 更新编辑器草稿请求
/// </summary>
public class UpdateResumeEditorDraftRequest
{
    /// <summary>
    /// 草稿内容
    /// </summary>
    public ResumeEditorDraft Draft { get; set; } = new();
}

/// <summary>
/// 编辑器草稿响应
/// </summary>
public class ResumeEditorDraftResponse
{
    /// <summary>
    /// 草稿 ID
    /// </summary>
    public string DraftId { get; set; } = string.Empty;

    /// <summary>
    /// 草稿内容
    /// </summary>
    public ResumeEditorDraft Draft { get; set; } = new();

    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>
/// 简历编辑器草稿
/// </summary>
public class ResumeEditorDraft
{
    public string TemplateId { get; set; } = "classic";
    public List<string> Modules { get; set; } = new();
    public Dictionary<string, bool> HiddenModules { get; set; } = new();
    public ResumeEditorAppearance Appearance { get; set; } = new();
    public ResumeEditorDocument Document { get; set; } = new();
}

public class ResumeEditorAppearance
{
    public string AccentColor { get; set; } = "#2563eb";
    public string FontScale { get; set; } = "md";
    public string PageSpacing { get; set; } = "standard";
    public string LineHeight { get; set; } = "normal";
}

public class ResumeEditorDocument
{
    public ResumeEditorProfile Profile { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
    public List<string> Skills { get; set; } = new();
    public List<ResumeEditorExperienceItem> Experience { get; set; } = new();
    public List<ResumeEditorProjectItem> Projects { get; set; } = new();
    public List<ResumeEditorEducationItem> Education { get; set; } = new();
    public string SourceText { get; set; } = string.Empty;
}

public class ResumeEditorProfile
{
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
}

public class ResumeEditorExperienceItem
{
    public string Id { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public List<string> Bullets { get; set; } = new();
}

public class ResumeEditorProjectItem
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public List<string> Bullets { get; set; } = new();
}

public class ResumeEditorEducationItem
{
    public string Id { get; set; } = string.Empty;
    public string School { get; set; } = string.Empty;
    public string Degree { get; set; } = string.Empty;
    public string Major { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
}
