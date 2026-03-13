using System.Text.Json;
using System.Text.RegularExpressions;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Services;

/// <summary>
/// 简历编辑器草稿服务
/// </summary>
public class ResumeEditorService : IResumeEditorService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private static readonly Regex EmailRegex = new(
        @"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex MobileRegex = new(
        @"(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)",
        RegexOptions.Compiled);

    private static readonly Regex DateRangeRegex = new(
        @"((?:19|20)\d{2}[./-]?(?:0?[1-9]|1[0-2])?)[\s至~-]+((?:至今|现在)|(?:19|20)\d{2}[./-]?(?:0?[1-9]|1[0-2])?)",
        RegexOptions.Compiled);

    private static readonly string[] SkillKeywords =
    {
        "React", "Vue", "TypeScript", "JavaScript", "Node.js", "Next.js", "Tailwind CSS",
        "CSS", "HTML", "Python", "Java", "Spring", "SQL", "Redis", "Docker", "Kubernetes", "AWS", "Git"
    };

    private readonly string _storageRoot;

    public ResumeEditorService()
    {
        _storageRoot = Path.Combine(AppContext.BaseDirectory, "storage", "editor-drafts");
    }

    public ResumeEditorDraft StructureDraft(StructureResumeEditorRequest request)
    {
        var sourceText = string.IsNullOrWhiteSpace(request.PolishedText)
            ? request.RawText
            : request.PolishedText!;
        var normalized = NormalizeText(sourceText);
        var lines = normalized
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
        var paragraphs = normalized
            .Split("\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(block => block.Replace('\n', ' ').Trim())
            .Where(block => !string.IsNullOrWhiteSpace(block))
            .ToList();

        return new ResumeEditorDraft
        {
            TemplateId = "classic",
            Modules = new List<string> { "profile", "summary", "experience", "projects", "education", "skills" },
            HiddenModules = new Dictionary<string, bool>(),
            Appearance = new ResumeEditorAppearance
            {
                AccentColor = "#2563eb",
                FontScale = "md",
                PageSpacing = "standard",
                LineHeight = "normal"
            },
            Document = new ResumeEditorDocument
            {
                Profile = new ResumeEditorProfile
                {
                    Name = ExtractName(lines),
                    Phone = MatchValue(MobileRegex, normalized),
                    Email = MatchValue(EmailRegex, normalized)
                },
                Summary = ExtractSummary(paragraphs),
                Skills = ExtractSkills(normalized),
                Experience = CreatePlaceholderExperience(paragraphs),
                Projects = CreatePlaceholderProjects(paragraphs),
                Education = CreatePlaceholderEducation(lines),
                SourceText = normalized
            }
        };
    }

    public async Task<ResumeEditorDraftResponse> CreateDraftAsync(ResumeEditorDraft draft, CancellationToken cancellationToken)
    {
        var draftId = $"editor_{DateTimeOffset.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}"[..30];
        var updatedAt = DateTimeOffset.UtcNow;
        var draftDir = GetDraftDirectory(draftId);
        Directory.CreateDirectory(draftDir);

        await WriteJsonAsync(Path.Combine(draftDir, "draft.json"), draft, cancellationToken);
        await WriteJsonAsync(Path.Combine(draftDir, "meta.json"), new ResumeEditorDraftMeta
        {
            DraftId = draftId,
            UpdatedAt = updatedAt
        }, cancellationToken);

        return new ResumeEditorDraftResponse
        {
            DraftId = draftId,
            Draft = draft,
            UpdatedAt = updatedAt
        };
    }

    public async Task<ResumeEditorDraftResponse?> GetDraftAsync(string draftId, CancellationToken cancellationToken)
    {
        var draftDir = GetDraftDirectory(draftId);
        var draftPath = Path.Combine(draftDir, "draft.json");
        var metaPath = Path.Combine(draftDir, "meta.json");

        if (!File.Exists(draftPath) || !File.Exists(metaPath))
        {
            return null;
        }

        var draft = await ReadJsonAsync<ResumeEditorDraft>(draftPath, cancellationToken);
        var meta = await ReadJsonAsync<ResumeEditorDraftMeta>(metaPath, cancellationToken);

        if (draft == null || meta == null)
        {
            return null;
        }

        return new ResumeEditorDraftResponse
        {
            DraftId = draftId,
            Draft = draft,
            UpdatedAt = meta.UpdatedAt
        };
    }

    public async Task<ResumeEditorDraftResponse?> UpdateDraftAsync(string draftId, ResumeEditorDraft draft, CancellationToken cancellationToken)
    {
        var draftDir = GetDraftDirectory(draftId);
        var metaPath = Path.Combine(draftDir, "meta.json");

        if (!Directory.Exists(draftDir) || !File.Exists(metaPath))
        {
            return null;
        }

        var updatedAt = DateTimeOffset.UtcNow;
        await WriteJsonAsync(Path.Combine(draftDir, "draft.json"), draft, cancellationToken);
        await WriteJsonAsync(metaPath, new ResumeEditorDraftMeta
        {
            DraftId = draftId,
            UpdatedAt = updatedAt
        }, cancellationToken);

        return new ResumeEditorDraftResponse
        {
            DraftId = draftId,
            Draft = draft,
            UpdatedAt = updatedAt
        };
    }

    private string GetDraftDirectory(string draftId)
    {
        return Path.Combine(_storageRoot, draftId);
    }

    private static async Task WriteJsonAsync<T>(string path, T value, CancellationToken cancellationToken)
    {
        await using var stream = File.Create(path);
        await JsonSerializer.SerializeAsync(stream, value, JsonOptions, cancellationToken);
    }

    private static async Task<T?> ReadJsonAsync<T>(string path, CancellationToken cancellationToken)
    {
        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions, cancellationToken);
    }

    private static string NormalizeText(string text)
    {
        return text.Replace("\r\n", "\n").Trim();
    }

    private static string MatchValue(Regex regex, string text)
    {
        var match = regex.Match(text);
        return match.Success ? match.Value : string.Empty;
    }

    private static string ExtractName(List<string> lines)
    {
        var firstLine = lines.FirstOrDefault() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(firstLine) || firstLine.Contains('@') || firstLine.Any(char.IsDigit) || firstLine.Length > 20)
        {
            return "未命名候选人";
        }

        return firstLine;
    }

    private static string ExtractSummary(List<string> paragraphs)
    {
        if (paragraphs.Count == 0)
        {
            return "请补充个人优势、岗位方向和代表性成果。";
        }

        var summary = paragraphs.FirstOrDefault(p => p.Length >= 40) ?? paragraphs[0];
        return summary.Length > 220 ? summary[..220] : summary;
    }

    private static List<string> ExtractSkills(string text)
    {
        return SkillKeywords
            .Where(skill => Regex.IsMatch(text, Regex.Escape(skill), RegexOptions.IgnoreCase))
            .ToList();
    }

    private static List<ResumeEditorExperienceItem> CreatePlaceholderExperience(List<string> paragraphs)
    {
        var sectionParagraphs = ExtractSectionParagraphs(paragraphs, new[] { "工作经历", "工作经验", "职业经历" });
        var source = sectionParagraphs.Count > 0 ? sectionParagraphs : paragraphs;

        var candidates = source
            .Where(paragraph => DateRangeRegex.IsMatch(paragraph) || Regex.IsMatch(paragraph, "公司|任职|负责|主导|推动"))
            .Take(2)
            .ToList();

        return candidates
            .Select((paragraph, index) =>
            {
                var dateMatch = DateRangeRegex.Match(paragraph);
                var period = dateMatch.Success ? $"{dateMatch.Groups[1].Value} - {dateMatch.Groups[2].Value}" : "待补充时间";

                return new ResumeEditorExperienceItem
                {
                    Id = $"exp-{index + 1}",
                    Company = $"待补充公司 {index + 1}",
                    Role = $"待补充岗位 {index + 1}",
                    Period = period,
                    Bullets = new List<string> { paragraph.Length > 120 ? paragraph[..120] : paragraph }
                };
            })
            .ToList();
    }

    private static List<ResumeEditorProjectItem> CreatePlaceholderProjects(List<string> paragraphs)
    {
        var sectionParagraphs = ExtractSectionParagraphs(paragraphs, new[] { "项目经历", "项目经验", "项目背景" });
        var source = sectionParagraphs.Count > 0 ? sectionParagraphs : paragraphs;

        var candidates = source
            .Where(paragraph => Regex.IsMatch(paragraph, "项目|系统|平台|优化|搭建|负责"))
            .Take(2)
            .ToList();

        return candidates
            .Select((paragraph, index) => new ResumeEditorProjectItem
            {
                Id = $"project-{index + 1}",
                Name = $"待补充项目 {index + 1}",
                Role = "待补充角色",
                Bullets = new List<string> { paragraph.Length > 120 ? paragraph[..120] : paragraph }
            })
            .ToList();
    }

    private static List<ResumeEditorEducationItem> CreatePlaceholderEducation(List<string> lines)
    {
        return lines
            .Where(line => Regex.IsMatch(line, "大学|学院|硕士|本科|博士|专科"))
            .Take(2)
            .Select((line, index) => new ResumeEditorEducationItem
            {
                Id = $"edu-{index + 1}",
                School = line,
                Degree = DetectDegree(line),
                Major = string.Empty,
                Period = "待补充时间"
            })
            .ToList();
    }

    private static string DetectDegree(string text)
    {
        if (Regex.IsMatch(text, "博士", RegexOptions.IgnoreCase))
        {
            return "博士";
        }

        if (Regex.IsMatch(text, "硕士|研究生", RegexOptions.IgnoreCase))
        {
            return "硕士";
        }

        if (Regex.IsMatch(text, "mba", RegexOptions.IgnoreCase))
        {
            return "MBA";
        }

        if (Regex.IsMatch(text, "本科", RegexOptions.IgnoreCase))
        {
            return "本科";
        }

        if (Regex.IsMatch(text, "专科|大专", RegexOptions.IgnoreCase))
        {
            return "专科";
        }

        return string.Empty;
    }

    private static List<string> ExtractSectionParagraphs(List<string> paragraphs, IEnumerable<string> headingKeywords)
    {
        var results = new List<string>();

        for (var i = 0; i < paragraphs.Count; i += 1)
        {
            var paragraph = paragraphs[i];
            if (!headingKeywords.Any(keyword => paragraph.Contains(keyword)))
            {
                continue;
            }

            for (var j = i + 1; j < paragraphs.Count; j += 1)
            {
                var next = paragraphs[j];
                if (Regex.IsMatch(next, "工作经历|项目经历|教育经历|专业技能|个人评价|自我评价|技能标签"))
                {
                    break;
                }

                results.Add(next);
            }

            if (results.Count > 0)
            {
                return results;
            }
        }

        return results;
    }

    private sealed class ResumeEditorDraftMeta
    {
        public string DraftId { get; set; } = string.Empty;
        public DateTimeOffset UpdatedAt { get; set; }
    }
}
