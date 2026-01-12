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
            : $"\n目标职位：{targetPosition}";

        return $@"
你是一位专业的{industryConfig.Name}领域简历优化专家。
你的任务是对用户的简历进行全文润色和优化。{positionHint}

## 优化原则
1. 使用 STAR 法则（情境 Situation、任务 Task、行动 Action、结果 Result）优化经历描述
2. 量化成果（增加具体数字、百分比、金额等）
3. 使用行业专业术语和关键词
4. 突出核心竞争力和独特价值
5. 保持简洁有力，避免冗余表达
6. 确保语言专业、正式

## 关键词参考
{string.Join("、", industryConfig.Keywords)}

## 输出 JSON 格式
{{
  ""polishedContent"": ""润色后的完整简历内容"",
  ""changes"": [
    {{
      ""original"": ""原文片段"",
      ""polished"": ""修改后片段"",
      ""reason"": ""修改原因""
    }}
  ],
  ""summary"": ""本次润色的整体说明（50-100字）""
}}

{BasePrompts.JsonConstraint}
";
    }
}
