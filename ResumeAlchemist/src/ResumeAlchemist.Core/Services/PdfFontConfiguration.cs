using QuestPDF.Infrastructure;

namespace ResumeAlchemist.Core.Services;

internal static class PdfFontConfiguration
{
    public const string PrimaryFontFamily = "Noto Sans CJK SC";
    private const string FallbackFontFamily = "Lato";
    private static int _configured;

    public static string[] FontFamilies => new[] { PrimaryFontFamily, FallbackFontFamily };

    public static void Configure()
    {
        if (Interlocked.Exchange(ref _configured, 1) == 1)
        {
            return;
        }

        QuestPDF.Settings.License = LicenseType.Community;
        QuestPDF.Settings.UseEnvironmentFonts = false;

        foreach (var path in ResolveFontDiscoveryPaths())
        {
            if (!QuestPDF.Settings.FontDiscoveryPaths.Contains(path, StringComparer.OrdinalIgnoreCase))
            {
                QuestPDF.Settings.FontDiscoveryPaths.Add(path);
            }
        }
    }

    private static IEnumerable<string> ResolveFontDiscoveryPaths()
    {
        var deployedFontsPath = Path.Combine(AppContext.BaseDirectory, "Resources", "Fonts");
        if (Directory.Exists(deployedFontsPath))
        {
            yield return deployedFontsPath;
        }

        var envPaths = Environment.GetEnvironmentVariable("RESUME_ALCHEMIST_PDF_FONT_DIRS");
        if (string.IsNullOrWhiteSpace(envPaths))
        {
            yield break;
        }

        foreach (var rawPath in envPaths.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (Directory.Exists(rawPath))
            {
                yield return rawPath;
            }
        }
    }
}
