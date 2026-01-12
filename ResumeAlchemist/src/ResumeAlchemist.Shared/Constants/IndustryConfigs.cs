namespace ResumeAlchemist.Shared.Constants;

/// <summary>
/// 行业配置
/// </summary>
public static class IndustryConfigs
{
    private static readonly Dictionary<string, IndustryConfig> _configs = new()
    {
        ["tech"] = new IndustryConfig
        {
            Id = "tech",
            Name = "互联网/科技",
            Dimensions = new[]
            {
                "技术栈深度",
                "项目复杂度",
                "技术影响力",
                "学习能力",
                "团队协作"
            },
            Keywords = new[]
            {
                "微服务", "分布式", "高并发", "性能优化",
                "DevOps", "CI/CD", "云原生", "架构设计"
            }
        },
        ["finance"] = new IndustryConfig
        {
            Id = "finance",
            Name = "金融/银行",
            Dimensions = new[]
            {
                "风险控制意识",
                "数据分析能力",
                "合规理解",
                "业务理解力",
                "抗压能力"
            },
            Keywords = new[]
            {
                "风控", "合规", "量化", "金融建模",
                "信贷", "投资", "风险管理", "数据分析"
            }
        },
        ["marketing"] = new IndustryConfig
        {
            Id = "marketing",
            Name = "市场/营销",
            Dimensions = new[]
            {
                "创意能力",
                "数据驱动意识",
                "品牌理解",
                "用户洞察",
                "执行力"
            },
            Keywords = new[]
            {
                "用户增长", "ROI", "品牌策略", "内容营销",
                "社交媒体", "SEO", "转化率", "用户运营"
            }
        },
        ["general"] = new IndustryConfig
        {
            Id = "general",
            Name = "通用",
            Dimensions = new[]
            {
                "专业技能",
                "工作经验",
                "教育背景",
                "沟通能力",
                "职业规划"
            },
            Keywords = new[]
            {
                "团队协作", "项目管理", "沟通能力", "执行力",
                "学习能力", "解决问题", "创新思维", "领导力"
            }
        }
    };

    /// <summary>
    /// 获取行业配置
    /// </summary>
    public static IndustryConfig Get(string industryId)
    {
        return _configs.TryGetValue(industryId, out var config)
            ? config
            : _configs["general"];
    }

    /// <summary>
    /// 获取所有行业配置
    /// </summary>
    public static IEnumerable<IndustryConfig> GetAll() => _configs.Values;
}

/// <summary>
/// 行业配置实体
/// </summary>
public class IndustryConfig
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string[] Dimensions { get; set; } = Array.Empty<string>();
    public string[] Keywords { get; set; } = Array.Empty<string>();
}
