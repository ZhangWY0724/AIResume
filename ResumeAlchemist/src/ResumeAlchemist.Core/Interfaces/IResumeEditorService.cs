using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// 简历编辑器服务
/// </summary>
public interface IResumeEditorService
{
    /// <summary>
    /// 将简历文本转换为编辑器草稿
    /// </summary>
    ResumeEditorDraft StructureDraft(StructureResumeEditorRequest request);

    /// <summary>
    /// 创建草稿
    /// </summary>
    Task<ResumeEditorDraftResponse> CreateDraftAsync(ResumeEditorDraft draft, CancellationToken cancellationToken);

    /// <summary>
    /// 获取草稿
    /// </summary>
    Task<ResumeEditorDraftResponse?> GetDraftAsync(string draftId, CancellationToken cancellationToken);

    /// <summary>
    /// 更新草稿
    /// </summary>
    Task<ResumeEditorDraftResponse?> UpdateDraftAsync(string draftId, ResumeEditorDraft draft, CancellationToken cancellationToken);
}
