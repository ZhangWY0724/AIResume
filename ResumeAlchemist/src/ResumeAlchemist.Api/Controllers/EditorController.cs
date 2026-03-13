using Microsoft.AspNetCore.Mvc;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Api.Controllers;

/// <summary>
/// 简历模板编辑器接口
/// </summary>
[ApiController]
[Route("api/editor")]
public class EditorController : ControllerBase
{
    private readonly IResumeEditorService _editorService;

    public EditorController(IResumeEditorService editorService)
    {
        _editorService = editorService;
    }

    /// <summary>
    /// 将文本结构化为编辑器草稿
    /// </summary>
    [HttpPost("structure")]
    [ProducesResponseType(typeof(ResumeEditorDraft), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<ResumeEditorDraft> Structure([FromBody] StructureResumeEditorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RawText) && string.IsNullOrWhiteSpace(request.PolishedText))
        {
            return BadRequest(new { message = "简历文本不能为空", code = "EMPTY_EDITOR_TEXT" });
        }

        return Ok(_editorService.StructureDraft(request));
    }

    /// <summary>
    /// 创建草稿
    /// </summary>
    [HttpPost("drafts")]
    [ProducesResponseType(typeof(ResumeEditorDraftResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ResumeEditorDraftResponse>> CreateDraft(
        [FromBody] CreateResumeEditorDraftRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _editorService.CreateDraftAsync(request.Draft, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// 获取草稿
    /// </summary>
    [HttpGet("drafts/{draftId}")]
    [ProducesResponseType(typeof(ResumeEditorDraftResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ResumeEditorDraftResponse>> GetDraft(string draftId, CancellationToken cancellationToken)
    {
        var draft = await _editorService.GetDraftAsync(draftId, cancellationToken);
        if (draft == null)
        {
            return NotFound(new { message = "编辑器草稿不存在", code = "EDITOR_DRAFT_NOT_FOUND" });
        }

        return Ok(draft);
    }

    /// <summary>
    /// 更新草稿
    /// </summary>
    [HttpPut("drafts/{draftId}")]
    [ProducesResponseType(typeof(ResumeEditorDraftResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ResumeEditorDraftResponse>> UpdateDraft(
        string draftId,
        [FromBody] UpdateResumeEditorDraftRequest request,
        CancellationToken cancellationToken)
    {
        var draft = await _editorService.UpdateDraftAsync(draftId, request.Draft, cancellationToken);
        if (draft == null)
        {
            return NotFound(new { message = "编辑器草稿不存在", code = "EDITOR_DRAFT_NOT_FOUND" });
        }

        return Ok(draft);
    }
}
