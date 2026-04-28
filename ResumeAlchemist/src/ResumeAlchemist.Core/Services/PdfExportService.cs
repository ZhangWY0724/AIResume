using Markdig;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.DTOs;
using System.Text.RegularExpressions;

namespace ResumeAlchemist.Core.Services;

/// <summary>
/// PDF 导出服务实现 - 专业简历模板
/// </summary>
public class PdfExportService : IPdfExportService
{
    private static readonly string PrimaryBlue = "#183B6B";
    private static readonly string AccentBlue = "#2E6DB4";
    private static readonly string TextColor = "#243042";
    private static readonly string TextMuted = "#5F6B7A";
    private static readonly string DividerColor = "#D8E2F0";
    private static readonly Regex PhoneRegex = new(
        @"(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)",
        RegexOptions.Compiled);

    static PdfExportService()
    {
        PdfFontConfiguration.Configure();
    }

    public byte[] GeneratePdf(PdfExportRequest request)
    {
        var markdown = request.Content;
        var sections = ParseMarkdownToSections(markdown);
        var resumeLayout = BuildResumeLayout(sections, request.FileName);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginTop(28);
                page.MarginBottom(24);
                page.MarginHorizontal(34);
                page.DefaultTextStyle(x => x
                    .FontFamily(PdfFontConfiguration.FontFamilies)
                    .FontSize(10.5f)
                    .FontColor(TextColor)
                    .LineHeight(1.55f));

                page.Header().Element(header => RenderPageHeader(header, resumeLayout));

                page.Content().PaddingTop(14).Column(column =>
                {
                    column.Spacing(4);

                    foreach (var section in resumeLayout.BodySections)
                    {
                        RenderSection(column, section);
                    }
                });
            });
        });

        return document.GeneratePdf();
    }

    private void RenderPageHeader(IContainer container, ResumeLayout resumeLayout)
    {
        container.Column(column =>
        {
            column.Item().AlignCenter().Text(resumeLayout.Name)
                .FontSize(24)
                .Bold()
                .FontColor(PrimaryBlue);

            foreach (var line in resumeLayout.HeaderLines)
            {
                column.Item().PaddingTop(3).AlignCenter().Text(NormalizeHeaderLine(line))
                    .FontSize(9.5f)
                    .FontColor(TextMuted);
            }

            column.Item().PaddingTop(10).LineHorizontal(1f).LineColor(DividerColor);
        });
    }

    private void RenderSection(ColumnDescriptor column, ResumeSection section)
    {
        switch (section.Type)
        {
            case SectionType.Title:
                RenderTitle(column, section);
                break;
            case SectionType.Header:
                RenderHeader(column, section);
                break;
            case SectionType.Paragraph:
                RenderParagraph(column, section);
                break;
            case SectionType.List:
                RenderList(column, section);
                break;
            case SectionType.SubHeader:
                RenderSubHeader(column, section);
                break;
            case SectionType.CompanyLine:
                RenderCompanyLine(column, section);
                break;
        }
    }

    private void RenderTitle(ColumnDescriptor column, ResumeSection section)
    {
        return;
    }

    private void RenderHeader(ColumnDescriptor column, ResumeSection section)
    {
        column.Item().PaddingTop(14).PaddingBottom(8).Row(row =>
        {
            row.AutoItem().Text(section.Content)
                .FontSize(12.5f)
                .Bold()
                .FontColor(PrimaryBlue);

            row.RelativeItem()
                .PaddingLeft(10)
                .AlignMiddle()
                .LineHorizontal(1f)
                .LineColor(DividerColor);
        });
    }

    private void RenderSubHeader(ColumnDescriptor column, ResumeSection section)
    {
        column.Item().PaddingTop(7).PaddingBottom(2).Text(section.Content)
            .FontSize(10.2f)
            .Bold()
            .FontColor(AccentBlue);
    }

    private void RenderCompanyLine(ColumnDescriptor column, ResumeSection section)
    {
        column.Item().PaddingTop(9).PaddingBottom(3).Row(row =>
        {
            row.RelativeItem().Text(text =>
            {
                if (!string.IsNullOrEmpty(section.Position))
                {
                    text.Span(section.Position)
                        .FontSize(11.2f)
                        .Bold()
                        .FontColor(TextColor);

                    if (!string.IsNullOrEmpty(section.Content))
                    {
                        text.Span("  ·  ")
                            .FontSize(10f)
                            .FontColor(TextMuted);
                    }
                }

                if (!string.IsNullOrEmpty(section.Content))
                {
                    text.Span(section.Content)
                        .FontSize(10.3f)
                        .FontColor(TextMuted);
                }
            });

            if (!string.IsNullOrEmpty(section.DateRange))
            {
                row.AutoItem().PaddingLeft(12).AlignRight().Text(section.DateRange)
                    .FontSize(9.5f)
                    .FontColor(TextMuted);
            }
        });
    }

    private void RenderParagraph(ColumnDescriptor column, ResumeSection section)
    {
        if (section.Content.Contains('|'))
        {
            column.Item().PaddingVertical(2).AlignCenter().Text(section.Content)
                .FontSize(9.5f)
                .FontColor(TextMuted);
        }
        else
        {
            column.Item().PaddingBottom(2).Text(section.Content)
                .FontSize(10.3f)
                .FontColor(TextColor)
                .LineHeight(1.7f);
        }
    }

    private void RenderList(ColumnDescriptor column, ResumeSection section)
    {
        column.Item().Column(listCol =>
        {
            int index = 1;
            foreach (var item in section.ListItems)
            {
                listCol.Item().PaddingVertical(2).Row(row =>
                {
                    if (section.IsOrdered)
                    {
                        row.AutoItem().Width(18).Text($"{index}.")
                            .FontSize(10f)
                            .FontColor(AccentBlue)
                            .Bold();
                    }
                    else
                    {
                        row.AutoItem().Width(14).PaddingTop(4).Text("•")
                            .FontSize(12f)
                            .FontColor(AccentBlue);
                    }

                    row.RelativeItem().Text(item)
                        .FontSize(10.2f)
                        .FontColor(TextColor)
                        .LineHeight(1.65f);
                });
                index++;
            }
        });
    }

    private ResumeLayout BuildResumeLayout(List<ResumeSection> sections, string? fallbackName)
    {
        var bodySections = new List<ResumeSection>();
        var headerLines = new List<string>();
        var name = string.IsNullOrWhiteSpace(fallbackName) ? "简历" : fallbackName;
        var titleConsumed = false;
        var encounteredBodyHeader = false;

        foreach (var section in sections)
        {
            if (!titleConsumed && section.Type == SectionType.Title)
            {
                titleConsumed = true;
                if (!string.IsNullOrWhiteSpace(section.Content))
                {
                    name = section.Content;
                }
                continue;
            }

            if (section.Type == SectionType.Header)
            {
                encounteredBodyHeader = true;
            }

            if (!encounteredBodyHeader && section.Type == SectionType.Paragraph && IsHeaderMetaLine(section.Content))
            {
                headerLines.Add(section.Content);
                continue;
            }

            bodySections.Add(section);
        }

        return new ResumeLayout
        {
            Name = name,
            HeaderLines = headerLines,
            BodySections = bodySections
        };
    }

    private static bool IsHeaderMetaLine(string text)
    {
        return text.Contains('|') || text.Contains('@') || PhoneRegex.IsMatch(text);
    }

    private static string NormalizeHeaderLine(string line)
    {
        return Regex.Replace(line.Trim(), @"\s*\|\s*", "  ·  ");
    }

    private List<ResumeSection> ParseMarkdownToSections(string markdown)
    {
        var sections = new List<ResumeSection>();
        var pipeline = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions()
            .Build();
        var document = Markdown.Parse(markdown, pipeline);

        bool isFirstHeading = true;

        foreach (var block in document)
        {
            ProcessBlock(block, sections, ref isFirstHeading);
        }

        return sections;
    }

    private void ProcessBlock(Block block, List<ResumeSection> sections, ref bool isFirstHeading)
    {
        switch (block)
        {
            case HeadingBlock heading:
                var headingText = GetInlineText(heading.Inline);
                if (heading.Level == 1 && isFirstHeading)
                {
                    sections.Add(new ResumeSection
                    {
                        Type = SectionType.Title,
                        Content = headingText
                    });
                    isFirstHeading = false;
                }
                else if (heading.Level == 2)
                {
                    sections.Add(new ResumeSection
                    {
                        Type = SectionType.Header,
                        Content = headingText
                    });
                }
                else if (heading.Level >= 3)
                {
                    // 解析公司/项目行，尝试提取日期
                    var parsed = ParseCompanyLine(headingText);
                    if (parsed.HasDate)
                    {
                        sections.Add(new ResumeSection
                        {
                            Type = SectionType.CompanyLine,
                            Content = parsed.Company,
                            Position = parsed.Position,
                            DateRange = parsed.DateRange
                        });
                    }
                    else
                    {
                        sections.Add(new ResumeSection
                        {
                            Type = SectionType.SubHeader,
                            Content = headingText
                        });
                    }
                }
                break;

            case ParagraphBlock paragraph:
                var paragraphText = GetInlineText(paragraph.Inline);
                if (!string.IsNullOrWhiteSpace(paragraphText))
                {
                    // 检查是否是"内容："、"业绩："等子标题
                    if (IsLabelLine(paragraphText))
                    {
                        sections.Add(new ResumeSection
                        {
                            Type = SectionType.SubHeader,
                            Content = paragraphText
                        });
                    }
                    else
                    {
                        sections.Add(new ResumeSection
                        {
                            Type = SectionType.Paragraph,
                            Content = paragraphText
                        });
                    }
                }
                break;

            case ListBlock list:
                var items = new List<string>();
                foreach (var item in list)
                {
                    if (item is ListItemBlock listItem)
                    {
                        var itemText = GetBlockText(listItem);
                        if (!string.IsNullOrWhiteSpace(itemText))
                        {
                            items.Add(itemText);
                        }
                    }
                }
                if (items.Count > 0)
                {
                    sections.Add(new ResumeSection
                    {
                        Type = SectionType.List,
                        ListItems = items,
                        IsOrdered = list.IsOrdered
                    });
                }
                break;

            case QuoteBlock quote:
                foreach (var child in quote)
                {
                    ProcessBlock(child, sections, ref isFirstHeading);
                }
                break;

            case ContainerBlock container:
                foreach (var child in container)
                {
                    ProcessBlock(child, sections, ref isFirstHeading);
                }
                break;
        }
    }

    /// <summary>
    /// 解析公司行，提取公司名、职位和日期
    /// 支持格式：公司名 职位 2021.06-2023.06
    /// </summary>
    private (string Company, string Position, string DateRange, bool HasDate) ParseCompanyLine(string text)
    {
        // 匹配日期模式：2021.06-2023.06 或 2021/06-2023/06 或 2021年6月-2023年6月
        var datePattern = @"(\d{4}[./年]\d{1,2}[月]?\s*[-–—至]\s*(?:\d{4}[./年]\d{1,2}[月]?|至今|现在|present))";
        var match = Regex.Match(text, datePattern, RegexOptions.IgnoreCase);

        if (match.Success)
        {
            var dateRange = match.Value.Trim();
            var beforeDate = text.Substring(0, match.Index).Trim();

            // 尝试分离公司名和职位
            var parts = beforeDate.Split(new[] { "  ", "\t", " - ", "，", "," }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2)
            {
                return (parts[0].Trim(), string.Join(" ", parts.Skip(1)).Trim(), dateRange, true);
            }
            return (beforeDate, "", dateRange, true);
        }

        return (text, "", "", false);
    }

    /// <summary>
    /// 检查是否是标签行（如 "内容："、"业绩："、"项目描述："）
    /// </summary>
    private bool IsLabelLine(string text)
    {
        var labels = new[] { "内容", "业绩", "职责", "成果", "项目描述", "技术栈", "主要工作", "工作内容" };
        var trimmed = text.Trim();
        return labels.Any(label =>
            trimmed.StartsWith(label + "：") ||
            trimmed.StartsWith(label + ":") ||
            trimmed == label + "：" ||
            trimmed == label + ":");
    }

    private string GetInlineText(ContainerInline? inline)
    {
        if (inline == null) return string.Empty;

        var text = new System.Text.StringBuilder();
        foreach (var child in inline)
        {
            switch (child)
            {
                case LiteralInline literal:
                    text.Append(literal.Content);
                    break;
                case EmphasisInline emphasis:
                    text.Append(GetInlineText(emphasis));
                    break;
                case CodeInline code:
                    text.Append(code.Content);
                    break;
                case LinkInline link:
                    text.Append(GetInlineText(link));
                    break;
                case LineBreakInline:
                    text.Append("\n");
                    break;
                case HtmlInline:
                    break;
                default:
                    if (child is ContainerInline containerInline)
                    {
                        text.Append(GetInlineText(containerInline));
                    }
                    break;
            }
        }
        return text.ToString().Trim();
    }

    private string GetBlockText(ContainerBlock container)
    {
        var text = new System.Text.StringBuilder();
        foreach (var block in container)
        {
            if (block is ParagraphBlock paragraph)
            {
                if (text.Length > 0) text.Append("\n");
                text.Append(GetInlineText(paragraph.Inline));
            }
            else if (block is ContainerBlock nestedContainer)
            {
                if (text.Length > 0) text.Append("\n");
                text.Append(GetBlockText(nestedContainer));
            }
        }
        return text.ToString().Trim();
    }

    private class ResumeSection
    {
        public SectionType Type { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string DateRange { get; set; } = string.Empty;
        public List<string> ListItems { get; set; } = new();
        public bool IsOrdered { get; set; }
    }

    private enum SectionType
    {
        Title,
        Header,
        SubHeader,
        Paragraph,
        List,
        CompanyLine
    }

    private sealed class ResumeLayout
    {
        public string Name { get; set; } = "简历";
        public List<string> HeaderLines { get; set; } = new();
        public List<ResumeSection> BodySections { get; set; } = new();
    }
}
