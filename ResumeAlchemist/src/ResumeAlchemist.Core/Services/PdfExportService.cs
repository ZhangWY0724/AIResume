using Markdig;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Services;

/// <summary>
/// PDF 导出服务实现 - 现代专业风格模板
/// </summary>
public class PdfExportService : IPdfExportService
{
    // 现代配色方案
    private static readonly string PrimaryColor = "#1e293b";      // 深灰蓝（标题）
    private static readonly string AccentColor = "#0891b2";       // 青色（强调）
    private static readonly string TextColor = "#334155";         // 正文颜色
    private static readonly string BorderColor = "#e2e8f0";       // 边框颜色
    private static readonly string BgLight = "#f8fafc";           // 浅灰背景

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
                page.MarginVertical(30);
                page.MarginHorizontal(40);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(TextColor));

                page.Content().Column(column =>
                {
                    column.Spacing(6);

                    foreach (var section in sections)
                    {
                        RenderSection(column, section);
                    }
                });

                // 现代页脚
                page.Footer().Height(30).AlignCenter().AlignMiddle().Row(row =>
                {
                    row.RelativeItem().AlignCenter().Text(text =>
                    {
                        text.Span("━━━  ").FontSize(8).FontColor(BorderColor);
                        text.Span("ResumeAlchemist").FontSize(8).FontColor(AccentColor).SemiBold();
                        text.Span("  ━━━").FontSize(8).FontColor(BorderColor);
                    });
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
        }
    }

    private void RenderTitle(ColumnDescriptor column, ResumeSection section)
    {
        // 现代标题区域 - 带背景色块
        column.Item().PaddingBottom(10).Element(container =>
        {
            container.Background(BgLight).Padding(20).Column(col =>
            {
                // 姓名
                col.Item().Text(section.Content)
                    .FontSize(28)
                    .Bold()
                    .FontColor(PrimaryColor)
                    .LetterSpacing(0.5f);

                // 装饰线
                col.Item().PaddingTop(10).Row(row =>
                {
                    row.AutoItem().Width(60).Height(3).Background(AccentColor);
                    row.AutoItem().PaddingLeft(4).Width(20).Height(3).Background(BorderColor);
                    row.AutoItem().PaddingLeft(4).Width(10).Height(3).Background(BorderColor);
                });
            });
        });
    }

    private void RenderHeader(ColumnDescriptor column, ResumeSection section)
    {
        // 现代分区标题
        column.Item().PaddingTop(16).PaddingBottom(8).Column(col =>
        {
            col.Item().Row(row =>
            {
                // 左侧装饰块
                row.AutoItem().Width(4).Height(20).Background(AccentColor);

                // 标题文字
                row.RelativeItem().PaddingLeft(12).AlignMiddle().Text(section.Content)
                    .FontSize(14)
                    .Bold()
                    .FontColor(PrimaryColor)
                    .LetterSpacing(0.3f);
            });

            // 底部细线
            col.Item().PaddingTop(6).PaddingLeft(16).LineHorizontal(0.5f).LineColor(BorderColor);
        });
    }

    private void RenderSubHeader(ColumnDescriptor column, ResumeSection section)
    {
        // 子标题 - 经历/项目名称
        column.Item().PaddingTop(10).PaddingBottom(3).Row(row =>
        {
            // 菱形装饰符号
            row.AutoItem().PaddingTop(4).PaddingRight(8)
                .Width(6).Height(6).Background(AccentColor);

            row.RelativeItem().Text(section.Content)
                .FontSize(11)
                .SemiBold()
                .FontColor(PrimaryColor);
        });
    }

    private void RenderParagraph(ColumnDescriptor column, ResumeSection section)
    {
        column.Item().PaddingVertical(3).PaddingLeft(14).Text(section.Content)
            .FontSize(10)
            .FontColor(TextColor)
            .LineHeight(1.6f);
    }

    private void RenderList(ColumnDescriptor column, ResumeSection section)
    {
        column.Item().PaddingLeft(14).Column(listCol =>
        {
            foreach (var item in section.ListItems)
            {
                listCol.Item().PaddingVertical(3).Row(row =>
                {
                    // 现代列表项符号 - 短横线
                    row.AutoItem().PaddingRight(10).PaddingTop(5)
                        .Width(8).Height(2).Background(AccentColor);

                    row.RelativeItem().Text(item)
                        .FontSize(10)
                        .FontColor(TextColor)
                        .LineHeight(1.5f);
                });
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
                    sections.Add(new ResumeSection
                    {
                        Type = SectionType.SubHeader,
                        Content = headingText
                    });
                }
                break;

            case ParagraphBlock paragraph:
                var paragraphText = GetInlineText(paragraph.Inline);
                if (!string.IsNullOrWhiteSpace(paragraphText))
                {
                    sections.Add(new ResumeSection
                    {
                        Type = SectionType.Paragraph,
                        Content = paragraphText
                    });
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
        public List<string> ListItems { get; set; } = new();
    }

    private enum SectionType
    {
        Title,
        Header,
        SubHeader,
        Paragraph,
        List
    }
}
