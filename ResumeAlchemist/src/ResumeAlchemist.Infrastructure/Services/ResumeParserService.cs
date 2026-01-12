using System.Text;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.DTOs;
using UglyToad.PdfPig;

namespace ResumeAlchemist.Infrastructure.Services;

/// <summary>
/// 简历解析服务实现
/// </summary>
public class ResumeParserService : IResumeParserService
{
    private readonly ILogger<ResumeParserService> _logger;
    private static readonly string[] SupportedExtensions = { ".pdf", ".docx", ".doc", ".txt" };

    public ResumeParserService(ILogger<ResumeParserService> logger)
    {
        _logger = logger;
    }

    public async Task<ImportResponse> ParseAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            return new ImportResponse
            {
                Success = false,
                ErrorMessage = "文件为空"
            };
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!SupportedExtensions.Contains(extension))
        {
            return new ImportResponse
            {
                Success = false,
                FileName = file.FileName,
                ErrorMessage = $"不支持的文件格式: {extension}，支持的格式: {string.Join(", ", SupportedExtensions)}"
            };
        }

        _logger.LogInformation("开始解析文件: {FileName}, 大小: {Size} bytes", file.FileName, file.Length);

        try
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream, cancellationToken);
            stream.Position = 0;

            var content = extension switch
            {
                ".pdf" => ParsePdf(stream),
                ".docx" => ParseDocx(stream),
                ".doc" => ParseDocx(stream), // 尝试用 OpenXml 解析
                ".txt" => await ParseTxt(stream, cancellationToken),
                _ => throw new NotSupportedException($"不支持的文件格式: {extension}")
            };

            _logger.LogInformation("文件解析成功: {FileName}, 内容长度: {Length}", file.FileName, content.Length);

            return new ImportResponse
            {
                Success = true,
                Content = content,
                FileName = file.FileName,
                FileType = extension.TrimStart('.')
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "文件解析失败: {FileName}", file.FileName);
            return new ImportResponse
            {
                Success = false,
                FileName = file.FileName,
                FileType = extension.TrimStart('.'),
                ErrorMessage = $"文件解析失败: {ex.Message}"
            };
        }
    }

    private string ParsePdf(Stream stream)
    {
        using var document = PdfDocument.Open(stream);
        var sb = new StringBuilder();

        foreach (var page in document.GetPages())
        {
            sb.AppendLine(page.Text);
        }

        return sb.ToString().Trim();
    }

    private string ParseDocx(Stream stream)
    {
        using var document = WordprocessingDocument.Open(stream, false);
        var body = document.MainDocumentPart?.Document?.Body;

        if (body == null)
        {
            return string.Empty;
        }

        var sb = new StringBuilder();
        foreach (var paragraph in body.Elements<Paragraph>())
        {
            sb.AppendLine(paragraph.InnerText);
        }

        return sb.ToString().Trim();
    }

    private async Task<string> ParseTxt(Stream stream, CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return await reader.ReadToEndAsync(cancellationToken);
    }
}
