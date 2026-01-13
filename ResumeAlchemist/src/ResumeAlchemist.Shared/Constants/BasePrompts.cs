namespace ResumeAlchemist.Shared.Constants;

/// <summary>
/// 基础提示词
/// </summary>
public static class BasePrompts
{
    /// <summary>
    /// JSON 格式约束
    /// </summary>
    public const string JsonConstraint = @"
【关键要求 - 必须严格遵守】
1. 直接输出原始 JSON，第一个字符必须是 {，最后一个字符必须是 }
2. 禁止使用 markdown 代码块（禁止使用三个反引号）
3. 禁止在 JSON 前后添加任何说明文字、解释或注释
4. 禁止输出任何引导语
5. 所有字符串值使用双引号，确保 JSON 格式正确
6. 数组和对象结构必须完整闭合
7. 只输出一个完整的 JSON 对象，不要有任何其他内容
";
}
