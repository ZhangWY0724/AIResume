namespace ResumeAlchemist.Shared.Constants;

/// <summary>
/// 行业配置
/// </summary>
public static class IndustryConfigs
{
    private static readonly Dictionary<string, IndustryConfig> _configs = new()
    {
        ["programmer"] = new IndustryConfig
        {
            Id = "programmer",
            Name = "技术/程序员",
            Dimensions = new[]
            {
                "技术栈匹配度",
                "项目复杂度",
                "工程质量意识",
                "问题解决能力",
                "协作与交付能力"
            },
            Keywords = new[]
            {
                "微服务", "分布式", "高并发", "性能优化",
                "系统设计", "数据库", "缓存", "DevOps"
            }
        },
        ["pm"] = new IndustryConfig
        {
            Id = "pm",
            Name = "产品经理",
            Dimensions = new[]
            {
                "业务理解",
                "需求分析能力",
                "产品规划能力",
                "数据驱动意识",
                "跨团队协作"
            },
            Keywords = new[]
            {
                "需求分析", "用户调研", "PRD", "A/B测试",
                "增长", "转化率", "埋点", "产品迭代"
            }
        },
        ["designer"] = new IndustryConfig
        {
            Id = "designer",
            Name = "UI/UX设计师",
            Dimensions = new[]
            {
                "视觉表达",
                "交互设计能力",
                "用户体验思维",
                "设计系统能力",
                "跨团队沟通"
            },
            Keywords = new[]
            {
                "用户旅程", "信息架构", "交互流程", "可用性测试",
                "设计规范", "组件库", "Figma", "原型设计"
            }
        },
        ["analyst"] = new IndustryConfig
        {
            Id = "analyst",
            Name = "数据分析师",
            Dimensions = new[]
            {
                "数据建模能力",
                "指标体系能力",
                "业务洞察能力",
                "实验分析能力",
                "沟通表达能力"
            },
            Keywords = new[]
            {
                "SQL", "数据建模", "指标体系", "A/B测试",
                "漏斗分析", "归因分析", "BI", "可视化"
            }
        },
        ["education"] = new IndustryConfig
        {
            Id = "education",
            Name = "教育行业",
            Dimensions = new[]
            {
                "学科专业能力",
                "教学设计能力",
                "课堂组织与表达",
                "学生成果与提分效果",
                "教研与协作能力"
            },
            Keywords = new[]
            {
                "教学设计", "课程研发", "学情分析", "课堂管理",
                "升学率", "提分", "教案", "教研"
            }
        },
        ["healthcare"] = new IndustryConfig
        {
            Id = "healthcare",
            Name = "医疗健康",
            Dimensions = new[]
            {
                "专业能力与资质",
                "临床/业务执行能力",
                "患者服务与沟通",
                "质量与安全意识",
                "协作与应急能力"
            },
            Keywords = new[]
            {
                "临床路径", "病历", "质控", "院感",
                "三查七对", "患者管理", "医疗安全", "合规"
            }
        },
        ["manufacturing"] = new IndustryConfig
        {
            Id = "manufacturing",
            Name = "制造业/工业",
            Dimensions = new[]
            {
                "工艺与设备能力",
                "质量管理能力",
                "成本与效率优化",
                "生产协同能力",
                "问题分析与改善"
            },
            Keywords = new[]
            {
                "精益生产", "六西格玛", "OEE", "良率",
                "SOP", "MES", "FMEA", "TPM"
            }
        },
        ["construction"] = new IndustryConfig
        {
            Id = "construction",
            Name = "建筑/工程",
            Dimensions = new[]
            {
                "专业技术能力",
                "项目管理能力",
                "成本与进度控制",
                "安全与质量意识",
                "协调与沟通能力"
            },
            Keywords = new[]
            {
                "BIM", "进度计划", "造价控制", "质量验收",
                "安全管理", "施工组织", "招投标", "竣工验收"
            }
        },
        ["legal"] = new IndustryConfig
        {
            Id = "legal",
            Name = "法务/合规",
            Dimensions = new[]
            {
                "法律专业能力",
                "风险识别能力",
                "合同与合规能力",
                "沟通与谈判能力",
                "业务支持能力"
            },
            Keywords = new[]
            {
                "合同审查", "合规体系", "法律检索", "诉讼/仲裁",
                "风险评估", "合规审计", "制度建设", "法务支持"
            }
        },
        ["operations"] = new IndustryConfig
        {
            Id = "operations",
            Name = "行政/运营",
            Dimensions = new[]
            {
                "流程建设能力",
                "执行与落地能力",
                "数据与复盘能力",
                "跨部门协同能力",
                "成本与资源管理"
            },
            Keywords = new[]
            {
                "SOP", "流程优化", "跨部门协同", "运营复盘",
                "成本控制", "项目推进", "资源调配", "效率提升"
            }
        },
        ["customer_service"] = new IndustryConfig
        {
            Id = "customer_service",
            Name = "客服/呼叫中心",
            Dimensions = new[]
            {
                "服务意识",
                "沟通与安抚能力",
                "问题定位与闭环能力",
                "效率与质量平衡",
                "数据与改进意识"
            },
            Keywords = new[]
            {
                "工单处理", "服务质检", "满意度", "投诉闭环",
                "首解率", "响应时效", "话术优化", "服务流程"
            }
        },
        ["sales"] = new IndustryConfig
        {
            Id = "sales",
            Name = "销售",
            Dimensions = new[]
            {
                "客户开发能力",
                "商机推进能力",
                "谈判与成交能力",
                "业绩达成能力",
                "客户关系维护"
            },
            Keywords = new[]
            {
                "线索转化", "商机管理", "成交率", "复购",
                "客户成功", "渠道拓展", "销售漏斗", "业绩目标"
            }
        },
        ["hr"] = new IndustryConfig
        {
            Id = "hr",
            Name = "人力资源",
            Dimensions = new[]
            {
                "招聘能力",
                "组织发展能力",
                "人才评估能力",
                "流程与合规意识",
                "沟通协调能力"
            },
            Keywords = new[]
            {
                "招聘流程", "人才盘点", "胜任力模型", "绩效管理",
                "员工关系", "组织发展", "培训体系", "劳动合规"
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
        ["ai_ml"] = new IndustryConfig
        {
            Id = "ai_ml",
            Name = "AI/大模型",
            Dimensions = new[]
            {
                "算法与模型能力",
                "数据工程能力",
                "工程落地能力",
                "业务理解与创新",
                "技术视野与学习"
            },
            Keywords = new[]
            {
                "大模型", "Prompt Engineering", "RAG", "微调/Fine-tuning",
                "推理优化", "向量数据库", "Agent", "模型评估"
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

    // 兼容历史/别名行业ID，避免因为前后端枚举不一致回落到 general
    private static readonly Dictionary<string, string> _industryAliases = new()
    {
        ["developer"] = "programmer",
        ["engineer"] = "programmer",
        ["it"] = "programmer",
        ["tech"] = "programmer",
        ["finance"] = "analyst",
        ["teacher"] = "education",
        ["edu"] = "education",
        ["tutor"] = "education",
        ["lecturer"] = "education",
        ["medical"] = "healthcare",
        ["hospital"] = "healthcare",
        ["manufacture"] = "manufacturing",
        ["factory"] = "manufacturing",
        ["engineering"] = "construction",
        ["law"] = "legal",
        ["compliance"] = "legal",
        ["ops"] = "operations",
        ["operation"] = "operations",
        ["support"] = "customer_service",
        ["cs"] = "customer_service",
        ["customer"] = "customer_service",
        ["ai"] = "ai_ml",
        ["ml"] = "ai_ml",
        ["llm"] = "ai_ml",
        ["deeplearning"] = "ai_ml",
        ["machinelearning"] = "ai_ml",
        ["nlp"] = "ai_ml",
        ["cv"] = "ai_ml"
    };

    /// <summary>
    /// 获取行业配置
    /// </summary>
    public static IndustryConfig Get(string industryId)
    {
        var normalizedId = (industryId ?? string.Empty).Trim().ToLowerInvariant();
        if (_industryAliases.TryGetValue(normalizedId, out var aliasTarget))
        {
            normalizedId = aliasTarget;
        }

        return _configs.TryGetValue(normalizedId, out var config)
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
