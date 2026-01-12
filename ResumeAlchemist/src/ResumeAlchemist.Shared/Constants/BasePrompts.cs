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
【重要】你必须严格按照以下规则返回：
1. 只返回纯 JSON 格式，不要有任何其他文字说明
2. 不要使用 markdown 代码块包裹
3. 确保 JSON 格式正确，可被程序直接解析
4. 所有字符串值使用双引号
5. 数组和对象结构必须完整闭合
";
}
