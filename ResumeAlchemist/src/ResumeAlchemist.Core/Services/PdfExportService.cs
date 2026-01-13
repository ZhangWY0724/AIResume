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
/// PDF 导出服务实现 - 简约专业风格模板
/// </summary>
public class PdfExportService : IPdfExportService
{
    // 颜色配置
    private static readonly string PrimaryColor = "#1a1a2e";      // 深蓝黑色
    private static readonly string SecondaryColor = "#16213e";    // 次要深蓝
    private static readonly string AccentColor = "#0f3460";       // 强调蓝色
    private static readonly string TextColor = "#2d3436";         // 正文颜色
    private static readonly string LightGray = "#636e72";         // 浅灰色
    private static readonly string BorderColor = "#dfe6e9";       // 边框颜色

    static PdfExportService()
    {
        // 设置 QuestPDF 社区版许可证
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
                page.MarginVertical(40);
                page.MarginHorizontal(45);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(TextColor));

                page.Content().Column(column =>
                {
                    column.Spacing(8);

                    foreach (var section in sections)
                    {
                        RenderSection(column, section);
                    }
                });

                // 页脚
                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("由 ").FontSize(8).FontColor(LightGray);
                    text.Span("ResumeAlchemist").FontSize(8).FontColor(AccentColor).SemiBold();
                    text.Span(" 智能生成").FontSize(8).FontColor(LightGray);
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
        column.Item().PaddingBottom(5).Column(col =>
        {
            col.Item().Text(section.Content)
                .FontSize(24)
                .Bold()
                .FontColor(PrimaryColor);

            col.Item().PaddingTop(8).LineHorizontal(2).LineColor(AccentColor);
        });
    }

    private void RenderHeader(ColumnDescriptor column, ResumeSection section)
    {
        column.Item().PaddingTop(12).PaddingBottom(4).Row(row =>
        {
            row.AutoItem().Width(4).Height(16).Background(AccentColor);
            row.RelativeItem().PaddingLeft(8).AlignMiddle().Text(section.Content)
                .FontSize(13)
                .Bold()
                .FontColor(SecondaryColor);
        });

        column.Item().LineHorizontal(0.5f).LineColor(BorderColor);
    }

    private void RenderSubHeader(ColumnDescriptor column, ResumeSection section)
    {
        column.Item().PaddingTop(6).PaddingBottom(2).Text(section.Content)
            .FontSize(11)
            .SemiBold()
            .FontColor(PrimaryColor);
    }

    private void RenderParagraph(ColumnDescriptor column, ResumeSection section)
    {
        column.Item().PaddingVertical(2).Text(section.Content)
            .FontSize(10)
            .FontColor(TextColor)
            .LineHeight(1.5f);
    }

    private void RenderList(ColumnDescriptor column, ResumeSection section)
    {
        column.Item().PaddingLeft(10).Column(listCol =>
        {
            foreach (var item in section.ListItems)
            {
                listCol.Item().PaddingVertical(2).Row(row =>
                {
                    row.AutoItem().PaddingRight(8).PaddingTop(5)
                        .Width(5).Height(5)
                        .Background(AccentColor);
                    row.RelativeItem().Text(item)
                        .FontSize(10)
                        .FontColor(TextColor)
                        .LineHeight(1.4f);
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
                // 处理引用块 - 将其内容作为段落处理
                foreach (var child in quote)
                {
                    ProcessBlock(child, sections, ref isFirstHeading);
                }
                break;

            case ContainerBlock container:
                // 处理其他容器类型块（递归处理子元素）
                foreach (var child in container)
                {
                    ProcessBlock(child, sections, ref isFirstHeading);
                }
                break;

            // 忽略其他块类型（如 ThematicBreakBlock, CodeBlock 等）
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
                    // 跳过 HTML 标签
                    break;
                default:
                    // 尝试获取其他内联元素的文本
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
