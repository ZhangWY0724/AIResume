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
    // 配色方案 - 专业蓝色主题
    private static readonly string PrimaryBlue = "#2B5797";       // 主蓝色（标题、姓名）
    private static readonly string TextColor = "#333333";         // 正文黑色
    private static readonly string TextMuted = "#666666";         // 次要文字

    static PdfExportService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GeneratePdf(PdfExportRequest request)
    {
        var markdown = request.Content;
        var sections = ParseMarkdownToSections(markdown);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginTop(35);
                page.MarginBottom(25);
                page.MarginHorizontal(40);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(TextColor).LineHeight(1.5f));

                page.Content().Column(column =>
                {
                    column.Spacing(4);

                    foreach (var section in sections)
                    {
                        RenderSection(column, section);
                    }
                });
            });
        });

        return document.GeneratePdf();
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
        // 姓名 - 居中蓝色大字
        column.Item().PaddingBottom(12).AlignCenter().Text(section.Content)
            .FontSize(26)
            .Bold()
            .FontColor(PrimaryBlue);
    }

    private void RenderHeader(ColumnDescriptor column, ResumeSection section)
    {
        // 分区标题 - 蓝色文字 + 蓝色下划线
        column.Item().PaddingTop(16).PaddingBottom(8).Column(col =>
        {
            col.Item().Text(section.Content)
                .FontSize(14)
                .Bold()
                .FontColor(PrimaryBlue);

            col.Item().PaddingTop(4).LineHorizontal(1.5f).LineColor(PrimaryBlue);
        });
    }

    private void RenderSubHeader(ColumnDescriptor column, ResumeSection section)
    {
        // 子标题（如 "内容："、"业绩："）- 加粗
        column.Item().PaddingTop(8).PaddingBottom(2).Text(section.Content)
            .FontSize(10)
            .Bold()
            .FontColor(TextColor);
    }

    private void RenderCompanyLine(ColumnDescriptor column, ResumeSection section)
    {
        // 公司行：公司名 + 职位 ... 日期右对齐
        column.Item().PaddingTop(10).PaddingBottom(4).Row(row =>
        {
            row.RelativeItem().Text(text =>
            {
                text.Span(section.Content)
                    .FontSize(11)
                    .Bold()
                    .FontColor(TextColor);

                if (!string.IsNullOrEmpty(section.Position))
                {
                    text.Span($"    {section.Position}")
                        .FontSize(10)
                        .FontColor(TextColor);
                }
            });

            if (!string.IsNullOrEmpty(section.DateRange))
            {
                row.AutoItem().AlignRight().Text(section.DateRange)
                    .FontSize(10)
                    .FontColor(TextMuted);
            }
        });
    }

    private void RenderParagraph(ColumnDescriptor column, ResumeSection section)
    {
        // 检查是否是个人信息行（包含 | 分隔符）
        if (section.Content.Contains('|'))
        {
            // 个人信息行 - 居中显示
            column.Item().PaddingVertical(2).AlignCenter().Text(section.Content)
                .FontSize(10)
                .FontColor(TextMuted);
        }
        else
        {
            column.Item().PaddingVertical(2).Text(section.Content)
                .FontSize(10)
                .FontColor(TextColor)
                .LineHeight(1.6f);
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
                    // 数字编号
                    row.AutoItem().Width(18).Text($"{index}.")
                        .FontSize(10)
                        .FontColor(TextColor);

                    row.RelativeItem().Text(item)
                        .FontSize(10)
                        .FontColor(TextColor)
                        .LineHeight(1.6f);
                });
                index++;
            }
        });
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
                        ListItems = items
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
}
