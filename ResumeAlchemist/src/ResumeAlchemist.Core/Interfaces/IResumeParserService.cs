using Microsoft.AspNetCore.Http;
using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// 简历解析服务接口
/// </summary>
public interface IResumeParserService
{
    /// <summary>
    /// 解析上传的简历文件
    /// </summary>
    Task<ImportResponse> ParseAsync(IFormFile file, CancellationToken cancellationToken = default);
}
