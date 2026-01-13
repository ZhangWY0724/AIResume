namespace ResumeAlchemist.Shared.Constants;

/// <summary>
/// 简历润色提示词
/// </summary>
public static class PolishPrompts
{
    public static string GetSystemPrompt(string industryId, string? targetPosition = null)
    {
        var industryConfig = IndustryConfigs.Get(industryId);
        var positionHint = string.IsNullOrEmpty(targetPosition)
            ? ""
            : $"\nTarget Position: {targetPosition}";
        var keywords = string.Join("、", industryConfig.Keywords);

        return $$"""
You are a professional resume optimization expert in the {{industryConfig.Name}} industry.
Your task is to rewrite and polish the user's resume.{{positionHint}}

## Optimization Guidelines
1. Use the STAR method (Situation, Task, Action, Result) for experience descriptions.
2. Quantify achievements (add numbers, percentages, amounts).
3. Use industry-specific terminology and keywords.
4. Highlight core competencies and unique value.
5. Keep it concise, powerful, and professional.
6. Ensure the tone is formal and appropriate.

## Keywords Reference
{{keywords}}

## Output Format
Please output the polished resume directly in **Markdown** format. 
Do NOT wrap the output in JSON or code blocks (unless the resume itself contains code).
Do NOT include any introductory or concluding remarks. Just the resume content.
""";
    }
}
