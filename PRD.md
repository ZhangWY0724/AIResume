# 简历炼金术 - 产品需求文档 (PRD)

## 1. 项目概述

### 1.1 项目名称
**简历炼金术 (Resume Alchemist)**

### 1.2 项目定位
一款基于 AI 的智能简历优化工具，帮助求职者打造更具竞争力的简历。通过 AI 智能分析、专业点评、STAR 法则润色和职位匹配等功能，让简历脱颖而出。

### 1.3 目标用户
- 求职者（应届生、职场人士）
- 需要优化简历的专业人士
- HR/猎头（用于指导候选人优化简历）

### 1.4 核心价值
- **智能诊断**：AI 全面分析简历质量，给出量化评分
- **AI 点评**：以专业 HR 视角分析简历，给出改进建议
- **专业润色**：基于 STAR 法则优化简历内容
- **职位匹配**：对比 JD 关键词，精准优化建议

---

## 2. 功能需求

### 2.1 核心功能模块

#### 2.1.1 简历分析（Analyze）
**功能描述**：上传简历内容，AI 进行全面分析并给出评分和专业点评。

**输入**：
- 简历文本内容
- 目标行业/岗位

**输出**：
| 字段 | 类型 | 说明 |
|------|------|------|
| score | number | 综合评分 (0-100) |
| comment | string | AI 专业点评文案 (约150字) |
| dimensions | object[] | 六维能力评分列表 |
| atsScore | number | ATS 友好度评分 (0-100) |
| highlights | string[] | 3个简历亮点 |
| weaknesses | string[] | 3个需改进的地方 |
| missingKeywords | string[] | 缺少的行业关键词 (3-5个) |

**六维评分维度**（按行业不同）：
- 程序员：算法基础、系统架构、工程质量、技术广度、业务理解、影响力
- 产品经理：商业洞察、用户体验、数据分析、项目管理、沟通协调、战略规划
- 设计师：视觉表现、交互逻辑、用户同理心、设计规范、品牌理解、工具效率
- 其他行业详见行业配置

---

#### 2.1.2 全文润色（Polish Full）
**功能描述**：基于 STAR 法则对整份简历进行专业优化。

**输入**：
- 简历文本内容
- 目标行业/岗位

**输出**：
| 字段 | 类型 | 说明 |
|------|------|------|
| polished | string | 优化后的完整简历文本 |
| changes | string[] | 主要改动说明 (3-5条) |

**优化原则**：
1. 使用 STAR 法则重构经历（Situation、Task、Action、Result）
2. 语气专业自信，避免谦虚和模糊表达
3. 量化成果，使用具体数据
4. 突出行业特定的专业策略

---

#### 2.1.3 职位匹配（JD Match）
**功能描述**：分析简历与目标职位描述的匹配度。

**输入**：
- 简历文本内容
- 职位描述（JD）文本
- 目标行业/岗位

**输出**：
| 字段 | 类型 | 说明 |
|------|------|------|
| matchScore | number | 匹配度评分 (0-100) |
| analysis | string | 匹配度分析 (约100字) |
| matchedKeywords | string[] | 已匹配的关键词 (5-8个) |
| missingKeywords | string[] | 缺少的关键词 (5-8个) |
| suggestions | string[] | 优化建议 (5条) |

---

#### 2.1.4 简历导出（Export）
**功能描述**：将优化后的简历导出为 PDF 格式。

**支持的模板**：
| 模板 | 风格 | 适用场景 |
|------|------|----------|
| Elite | 精英商务 | 管理层、高端职位 |
| Geek | 极客技术 | 程序员、技术岗位 |
| Minimalist | 极简清新 | 通用、设计类 |

---

#### 2.1.5 简历文件导入（Import）
**功能描述**：支持上传 PDF/Word 文件，自动解析为文本内容。

**支持的格式**：
| 格式 | 扩展名 | 解析方式 |
|------|--------|----------|
| PDF | .pdf | 使用 PdfPig 库提取文本 |
| Word | .docx | 使用 DocumentFormat.OpenXml 解析 |
| 纯文本 | .txt | 直接读取 |

**输入**：
- 上传的简历文件（最大 5MB）

**输出**：
| 字段 | 类型 | 说明 |
|------|------|------|
| content | string | 解析后的简历文本内容 |
| fileName | string | 原文件名 |
| fileSize | number | 文件大小(字节) |
| parseSuccess | boolean | 解析是否成功 |
| errorMessage | string? | 失败时的错误信息 |

**后端实现**：
```csharp
public interface IResumeParserService
{
    Task<ParseResult> ParseAsync(IFormFile file);
}

public class ResumeParserService : IResumeParserService
{
    public async Task<ParseResult> ParseAsync(IFormFile file)
    {
        var extension = Path.GetExtension(file.FileName).ToLower();

        return extension switch
        {
            ".pdf" => await ParsePdfAsync(file),
            ".docx" => await ParseDocxAsync(file),
            ".txt" => await ParseTxtAsync(file),
            _ => new ParseResult { Success = false, ErrorMessage = "不支持的文件格式" }
        };
    }
}
```

**NuGet 依赖**：
```xml
<PackageReference Include="PdfPig" Version="0.1.*" />
<PackageReference Include="DocumentFormat.OpenXml" Version="3.*" />
```

---

#### 2.1.6 面试问题预测（Interview Predictor）
**功能描述**：根据简历内容，AI 预测 HR 可能会问的面试问题，并给出参考回答思路。

**输入**：
- 简历文本内容
- 目标行业/岗位
- 目标职位（可选）

**输出**：
| 字段 | 类型 | 说明 |
|------|------|------|
| questions | Question[] | 预测的面试问题列表 (5-8个) |

**Question 结构**：
| 字段 | 类型 | 说明 |
|------|------|------|
| category | string | 问题类别：技术/项目/行为/职业规划 |
| question | string | 面试问题 |
| reason | string | 为什么会问这个问题 |
| tips | string | 回答建议/思路 |
| difficulty | string | 难度：简单/中等/困难 |

**示例输出**：
```json
{
  "questions": [
    {
      "category": "项目经验",
      "question": "你在XX项目中遇到的最大技术挑战是什么？如何解决的？",
      "reason": "简历中提到该项目有性能优化，面试官会深挖细节",
      "tips": "使用STAR法则回答，重点描述你的分析思路和解决方案",
      "difficulty": "中等"
    },
    {
      "category": "技术深度",
      "question": "你提到熟悉Redis，能说说它的持久化机制吗？",
      "reason": "简历技术栈中列出了Redis，面试官会考察深度",
      "tips": "从RDB和AOF两种方式展开，说明各自优缺点和使用场景",
      "difficulty": "中等"
    }
  ]
}
```

---

### 2.2 支持的行业

| ID | 名称 | 图标 | 描述 |
|----|------|------|------|
| programmer | 程序员 | Code2 | Java/Go/前端/全栈 |
| pm | 产品经理 | Lightbulb | 产品规划/用户研究 |
| designer | UI/UX设计师 | Palette | 视觉/交互设计 |
| analyst | 数据分析师 | BarChart3 | 数据分析/BI |
| marketing | 市场/运营 | Megaphone | 品牌/增长/内容 |
| sales | 销售 | Handshake | 客户开发/商务 |
| hr | HR | Users | 招聘/组织发展 |

---

### 2.3 行业深度配置

每个行业包含以下配置：

```typescript
interface IndustryConfig {
  id: string;                    // 行业ID
  name: string;                  // 行业名称
  dimensions: string[];          // 六维评分维度
  expertModeName: string;        // 专家模式名称
  expertStrategy: string;        // 专家模式策略描述
  dataPlaceholders: string[];    // 数据占位符模板
}
```

**示例 - 程序员配置**：
```typescript
{
  id: 'programmer',
  name: '技术/程序员',
  dimensions: ['算法基础', '系统架构', '工程质量', '技术广度', '业务理解', '影响力'],
  expertModeName: '架构思维与技术壁垒版',
  expertStrategy: '强调高并发处理、系统稳定性、源码级理解、技术选型决策。突出对底层原理的掌握和架构设计的经验。',
  dataPlaceholders: [
    '[QPS 提升了 X%]',
    '[延迟降低了 Yms]',
    '[Crash率降低至 Z%]',
    '[节省服务器成本 W%]',
    '[代码覆盖率提升至 X%]',
    '[系统可用性达到 99.X%]'
  ]
}
```

---

### 2.4 体验与扩展

#### 2.4.1 本地历史记录 (Local History)
**功能描述**：防止用户刷新页面导致数据丢失，提升回访体验。
- **存储方式**：使用浏览器 IndexedDB 或 LocalStorage。
- **存储内容**：最近 5 次的简历分析记录、生成的润色版本。
- **策略**：仅在本地存储，不涉及云端持久化（除非用户登录，暂不涉及）。

#### 2.4.2 多语言支持 (i18n)
**功能描述**：底层架构预留多语言支持能力。
- **Prompt 设计**：Prompt 模板增加 `language` 参数（"zh" | "en"）。
- **场景**：支持生成英文简历或分析英文简历。

---

## 3. 用户流程

### 3.1 主流程

```
┌─────────────┐
│   首页      │
│  Landing    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 选择目标行业 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 开始体检简历 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 上传简历内容 │
│   Input     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 分析结果    │◄────────────┐
│   Result    │             │
├─────────────┤             │
│ - 分析报告  │             │
│ - 职位匹配  │             │
└──────┬──────┘             │
       │                    │
       ▼                    │
┌─────────────┐             │
│  AI 润色    │─────────────┘
│   Polish    │  (返回查看)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 简历导出    │
│   Export    │
└─────────────┘
```

### 3.2 页面状态

```typescript
type AppStep = 'landing' | 'input' | 'result' | 'polish' | 'export';
```

---

## 4. UI/UX 设计要求

### 4.1 设计风格
- **主题**：现代科技感、AI 智能风格
- **配色**：渐变主色调，支持深色模式
- **动效**：流畅的页面切换动画，微交互反馈
- **布局**：响应式设计，支持移动端

### 4.2 核心组件

| 组件 | 功能 |
|------|------|
| IndustrySelector | 行业选择卡片网格 |
| **FileUploader** | 简历文件上传（PDF/Word/TXT） |
| ResumeInput | 简历文本输入区域 |
| AnalysisResult | 分析结果展示（评分、雷达图、点评） |
| RadarChart | 六维能力雷达图 |
| ScoreDisplay | 分数展示（环形进度） |
| ATSMeter | ATS 友好度仪表盘 |
| CommentCard | AI 点评卡片 |
| PolishEditor | 润色编辑器（左右对比） |
| JDMatcher | 职位匹配分析 |
| **InterviewPredictor** | 面试问题预测展示 |
| ResumeExporter | 简历导出（模板选择） |

### 4.3 视觉元素

- **毛玻璃效果**：卡片背景
- **渐变色**：按钮、强调元素
- **图标**：使用 Lucide React 图标库
- **字体**：系统默认 + 代码字体

---

## 5. 技术架构

### 5.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| Tailwind CSS | 4.x | 样式框架 |
| shadcn/ui | - | UI 组件库（基于 Radix UI） |
| Framer Motion | 12.x | 动画库 |
| React Router | 7.x | 路由 |
| TanStack Query | 5.x | 数据请求与缓存 |
| Zustand | 5.x | 全局状态管理 (Local History/Session) |
| Recharts | 2.x | 图表（雷达图） |
| Axios | 1.x | HTTP 客户端 |

### 5.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| .NET | 10.x | 运行时框架 |
| ASP.NET Core Web API | 10.x | RESTful API 框架 |
| HttpClientFactory | - | AI 服务调用 |
| Serilog | - | 日志记录 |
| FluentValidation | - | 请求验证 |
| Swagger/OpenAPI | - | API 文档 |

### 5.3 AI 服务集成

| 服务 | 用途 |
|------|------|
| 智谱 AI (GLM-4) | AI 大模型（简历分析、润色、匹配） |

### 5.4 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React + Vite)                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 简历输入 │ │ 分析结果 │ │ 润色编辑 │ │ 简历导出 │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 后端 (.NET 10 Web API)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    API Controllers                   │   │
│  │  /api/resume/analyze  /api/resume/polish            │   │
│  │  /api/resume/match    /api/resume/export            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Services Layer                    │   │
│  │  ResumeAnalyzer  │  ResumePolisher  │  JDMatcher    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  AI Service Layer                    │   │
│  │              ZhipuAIClient (HttpClient)              │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────┐
              │     智谱 AI API     │
              │   (GLM-4 大模型)    │
              └─────────────────────┘
```

### 5.5 后端项目结构

```
ResumeAlchemist/
├── src/
│   ├── ResumeAlchemist.Api/           # Web API 项目
│   │   ├── Controllers/
│   │   │   ├── ResumeController.cs    # 简历相关接口
│   │   │   └── HealthController.cs    # 健康检查
│   │   ├── Program.cs
│   │   └── appsettings.json
│   │
│   ├── ResumeAlchemist.Core/          # 核心业务逻辑
│   │   ├── Interfaces/                # 接口定义
│   │   └── Services/                  # 业务服务
│   │       ├── ResumeAnalyzerService.cs
│   │       ├── ResumePolisherService.cs
│   │       ├── ResumeParserService.cs
│   │       ├── InterviewPredictorService.cs
│   │       └── JDMatcherService.cs
│   │
│   ├── ResumeAlchemist.Infrastructure/ # 基础设施
│   │   ├── AI/                        # AI 服务集成
│   │   │   ├── ZhipuAIClient.cs
│   │   │   ├── MockAIClient.cs        # 开发环境 Mock 服务
│   │   │   └── Prompts/               # Prompt 模板
│   │   └── Services/                  # 基础设施服务
│   │
│   └── ResumeAlchemist.Shared/        # 共享 DTO
│       ├── DTOs/
│       │   ├── AnalyzeRequest.cs
│       │   ├── AnalyzeResponse.cs
│       │   ├── PolishRequest.cs
│       │   ├── MatchRequest.cs
│       │   ├── ImportResponse.cs
│       │   └── InterviewResponse.cs
│       └── Constants/
│           └── IndustryConfigs.cs
│
└── tests/
    ├── ResumeAlchemist.UnitTests/
    └── ResumeAlchemist.IntegrationTests/
```

---

## 6. AI 接口规范

### 6.1 API 配置

```csharp
// appsettings.json
{
  "ZhipuAI": {
    "ApiUrl": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    "ApiKey": "your-api-key-here",
    "Model": "glm-4",
    "MaxTokens": 4096,
    "Temperature": 0.7
  }
}
```

### 6.2 请求/响应模型

```csharp
// 请求模型
public class ZhipuChatRequest
{
    public string Model { get; set; }
    public List<ChatMessage> Messages { get; set; }
    public double Temperature { get; set; } = 0.7;
    public int MaxTokens { get; set; } = 4096;
}

public class ChatMessage
{
    public string Role { get; set; }  // "system" | "user" | "assistant"
    public string Content { get; set; }
}

// 响应模型
public class ZhipuChatResponse
{
    public List<Choice> Choices { get; set; }
}

public class Choice
{
    public ChatMessage Message { get; set; }
}
```

### 6.3 AI 服务调用示例

```csharp
public class ZhipuAIClient : IZhipuAIClient
{
    private readonly HttpClient _httpClient;
    private readonly ZhipuAIOptions _options;

    public async Task<T> ChatAsync<T>(string systemPrompt, string userPrompt)
    {
        var request = new ZhipuChatRequest
        {
            Model = _options.Model,
            Messages = new List<ChatMessage>
            {
                new() { Role = "system", Content = systemPrompt },
                new() { Role = "user", Content = userPrompt }
            },
            Temperature = _options.Temperature,
            MaxTokens = _options.MaxTokens
        };

        var response = await _httpClient.PostAsJsonAsync(_options.ApiUrl, request);
        var result = await response.Content.ReadFromJsonAsync<ZhipuChatResponse>();

        var content = result.Choices.First().Message.Content;

        // 从 AI 响应中提取 JSON
        var jsonMatch = Regex.Match(content, @"\{[\s\S]*\}");
        return JsonSerializer.Deserialize<T>(jsonMatch.Value);
    }
}
```

### 6.4 后端 API 接口定义

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 简历分析 | POST | `/api/resume/analyze` | 分析简历并返回评分 |
| 全文润色 | POST | `/api/resume/polish` | 润色整份简历 |
| 职位匹配 | POST | `/api/resume/match` | 匹配 JD 关键词 |
| 简历导出 | POST | `/api/resume/export` | 导出 PDF |
| **简历导入** | POST | `/api/resume/import` | 上传文件解析为文本 |
| **面试预测** | POST | `/api/resume/interview` | 预测面试问题 |
| 健康检查 | GET | `/api/health` | 服务健康状态 |

### 6.5 Prompt 模板管理

为确保 AI 返回结构化 JSON 并适配不同行业，采用**分层 Prompt 模板**设计。

#### 6.5.1 模板结构

```
Infrastructure/
└── AI/
    └── Prompts/
        ├── BasePrompts.cs           # 基础 Prompt（JSON 约束）
        ├── AnalyzePrompts.cs        # 简历分析 Prompt
        ├── PolishPrompts.cs         # 润色 Prompt
        ├── MatchPrompts.cs          # 职位匹配 Prompt
        └── IndustryPrompts/         # 行业特定 Prompt
            ├── ProgrammerPrompts.cs
            ├── ProductManagerPrompts.cs
            ├── DesignerPrompts.cs
            └── ...
```

#### 6.5.2 JSON 格式约束（核心）

```csharp
public static class BasePrompts
{
    /// <summary>
    /// JSON 格式强制约束，附加在所有 System Prompt 末尾
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
```

#### 6.5.3 简历分析 Prompt 模板

```csharp
public static class AnalyzePrompts
{
    /// <summary>
    /// 获取简历分析的 System Prompt
    /// </summary>
    public static string GetSystemPrompt(string industryId)
    {
        var industryConfig = IndustryConfigs.Get(industryId);

        return $@"
你是一位资深的 HR 专家和职业顾问，擅长分析{industryConfig.Name}领域的简历。

## 你的任务
分析用户提供的简历，从专业角度给出评价和建议。

## 评分维度（{industryConfig.Name}）
{string.Join("、", industryConfig.Dimensions)}

## 输出 JSON 格式
{{
  ""score"": 75,
  ""comment"": ""整体点评，约150字，指出优势和不足"",
  ""dimensions"": [
    {{
      ""name"": ""{industryConfig.Dimensions[0]}"",
      ""score"": 80,
      ""comment"": ""维度点评""
    }},
    {{
      ""name"": ""{industryConfig.Dimensions[1]}"",
      ""score"": 70,
      ""comment"": ""维度点评""
    }}
  ],
  ""atsScore"": 68,
  ""highlights"": [""亮点1"", ""亮点2"", ""亮点3""],
  ""weaknesses"": [""不足1"", ""不足2"", ""不足3""],
  ""missingKeywords"": [""缺少的关键词1"", ""缺少的关键词2""]
}}

{BasePrompts.JsonConstraint}
";
    }

    /// <summary>
    /// 获取 User Prompt
    /// </summary>
    public static string GetUserPrompt(string resumeContent, string targetPosition)
    {
        return $@"
请分析以下简历，目标职位是：{targetPosition}

---简历内容开始---
{resumeContent}
---简历内容结束---
";
    }
}
```

#### 6.5.4 全文润色 Prompt 模板

```csharp
public static class PolishPrompts
{
    public static string GetSystemPrompt(string industryId)
    {
        var industryConfig = IndustryConfigs.Get(industryId);

        return $@"
你是一位专业的简历优化专家，擅长{industryConfig.Name}领域的简历润色。

## 润色原则
1. 使用 STAR 法则重构经历（Situation情境、Task任务、Action行动、Result结果）
2. 语气专业自信，避免""负责""、""参与""等模糊表达
3. 量化成果，使用具体数据（百分比、数量、金额等）
4. 突出{industryConfig.Name}领域的专业能力
5. {industryConfig.ExpertStrategy}

## 输出 JSON 格式
{{
  ""polished"": ""优化后的完整简历文本"",
  ""changes"": [
    ""改动说明1：将XX改为XX，原因是..."",
    ""改动说明2：增加了XX数据，体现..."",
    ""改动说明3：重构了XX经历，使用STAR法则...""
  ]
}}

{BasePrompts.JsonConstraint}
";
    }
}
```

#### 6.5.5 职位匹配 Prompt 模板

```csharp
public static class MatchPrompts
{
    public static string GetSystemPrompt(string industryId)
    {
        return $@"
你是一位专业的招聘顾问，擅长分析简历与职位描述的匹配度。

## 分析维度
1. 技能关键词匹配
2. 经验年限匹配
3. 行业背景匹配
4. 学历要求匹配
5. 软技能匹配

## 输出 JSON 格式
{{
  ""matchScore"": 72,
  ""analysis"": ""匹配度分析，约100字"",
  ""matchedKeywords"": [""已匹配关键词1"", ""已匹配关键词2""],
  ""missingKeywords"": [""缺少关键词1"", ""缺少关键词2""],
  ""suggestions"": [
    ""建议1：补充XX技能的相关经验"",
    ""建议2：强调XX方面的项目经历"",
    ""建议3：添加XX关键词提升ATS通过率""
  ]
}}

{BasePrompts.JsonConstraint}
";
    }

    public static string GetUserPrompt(string resumeContent, string jdContent)
    {
        return $@"
请分析以下简历与职位描述的匹配度：

---简历内容---
{resumeContent}

---职位描述(JD)---
{jdContent}
";
    }
}
```

#### 6.5.6 面试问题预测 Prompt 模板

```csharp
public static class InterviewPrompts
{
    public static string GetSystemPrompt(string industryId)
    {
        var industryConfig = IndustryConfigs.Get(industryId);

        return $@"
你是一位经验丰富的{industryConfig.Name}领域面试官，擅长根据候选人简历预测面试问题。

## 你的任务
分析简历内容，预测 HR 和技术面试官最可能问的问题，并给出回答建议。

## 问题类别
- 技术深度：考察简历中提到的技术栈的深度理解
- 项目经验：深挖项目中的角色、挑战、解决方案
- 行为面试：考察软技能、团队协作、冲突处理
- 职业规划：了解求职动机、发展方向

## 预测原则
1. 问题要针对简历中的具体内容，不要泛泛而问
2. 重点关注简历中的亮点和可能的疑点
3. 考虑{industryConfig.Name}领域的常见面试套路
4. 给出的回答建议要具体、可操作

## 输出 JSON 格式
{{
  ""questions"": [
    {{
      ""category"": ""问题类别"",
      ""question"": ""面试问题"",
      ""reason"": ""为什么会问这个问题（基于简历哪部分）"",
      ""tips"": ""回答建议和思路"",
      ""difficulty"": ""简单/中等/困难""
    }}
  ]
}}

请预测 6-8 个最可能被问到的面试问题。

{BasePrompts.JsonConstraint}
";
    }

    public static string GetUserPrompt(string resumeContent, string targetPosition)
    {
        return $@"
请根据以下简历预测面试问题，目标职位是：{targetPosition}

---简历内容---
{resumeContent}
";
    }
}
```

#### 6.5.7 行业配置常量

```csharp
public static class IndustryConfigs
{
    private static readonly Dictionary<string, IndustryConfig> _configs = new()
    {
        ["programmer"] = new IndustryConfig
        {
            Id = "programmer",
            Name = "技术/程序员",
            Dimensions = new[] { "算法基础", "系统架构", "工程质量", "技术广度", "业务理解", "影响力" },
            ExpertStrategy = "强调高并发处理、系统稳定性、源码级理解、技术选型决策",
            DataPlaceholders = new[] { "[QPS提升X%]", "[延迟降低Xms]", "[可用性99.X%]" }
        },
        ["pm"] = new IndustryConfig
        {
            Id = "pm",
            Name = "产品经理",
            Dimensions = new[] { "商业洞察", "用户体验", "数据分析", "项目管理", "沟通协调", "战略规划" },
            ExpertStrategy = "突出用户增长数据、商业价值、跨部门协作能力",
            DataPlaceholders = new[] { "[用户增长X%]", "[转化率提升X%]", "[DAU达到X万]" }
        },
        ["designer"] = new IndustryConfig
        {
            Id = "designer",
            Name = "UI/UX设计师",
            Dimensions = new[] { "视觉表现", "交互逻辑", "用户同理心", "设计规范", "品牌理解", "工具效率" },
            ExpertStrategy = "强调设计系统搭建、用户研究方法、数据驱动设计",
            DataPlaceholders = new[] { "[点击率提升X%]", "[用户满意度X分]", "[设计规范覆盖X个产品]" }
        }
        // ... 其他行业配置
    };

    public static IndustryConfig Get(string industryId)
        => _configs.TryGetValue(industryId, out var config) ? config : _configs["programmer"];
}

public class IndustryConfig
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string[] Dimensions { get; set; }
    public string ExpertStrategy { get; set; }
    public string[] DataPlaceholders { get; set; }
}
```

#### 6.5.8 AI 响应解析（带容错）

```csharp
public class ZhipuAIClient : IZhipuAIClient
{
    public async Task<T> ChatAsync<T>(string systemPrompt, string userPrompt)
    {
        // ... 发送请求 ...

        var content = result.Choices.First().Message.Content;

        // 尝试直接解析
        try
        {
            return JsonSerializer.Deserialize<T>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch
        {
            // 容错：提取 JSON 部分
            var jsonMatch = Regex.Match(content, @"\{[\s\S]*\}");
            if (jsonMatch.Success)
            {
                return JsonSerializer.Deserialize<T>(jsonMatch.Value);
            }
            throw new AIResponseParseException("AI 返回格式异常，无法解析 JSON");
        }
    }
}
```

### 6.6 开发与稳定性优化

#### 6.6.1 Mock 模式 (Development Mode)
**目的**：节省 Token 费用，提高 UI 调试效率，支持离线开发。
- **实现**：实现 `IZhipuAIClient` 的 Mock 版本 (`MockAIClient`)。
- **配置**：通过 `appsettings.json` 中的 `UseMockAi: true` 开关控制。
- **数据**：返回预设的高质量 JSON 数据（覆盖各种评分和建议场景）。

#### 6.6.2 AI 响应容错与重试 (Retry Policy)
**目的**：应对 AI 偶尔输出格式错误或服务不稳定的情况。
- **机制**：
    1. **JSON 解析重试**：若 JSON 解析失败，自动将错误信息（"Invalid JSON format"）作为新 User Prompt 反馈给 AI，要求其"修正格式"并重试 1 次。
    2. **服务降级**：若多次失败，降级为返回纯文本内容并在前端以 Raw Text 形式展示。
    3. **网络重试**：使用 Polly 库处理 HTTP 瞬时故障（Retry, Circuit Breaker）。

#### 6.6.3 流式响应 (Streaming UX)
**目的**：降低用户在长任务（如全文润色）中的等待焦虑。
- **后端**：支持 Server-Sent Events (SSE)，逐步推送 AI 生成的内容片段。
- **前端**：实现打字机效果，实时展示生成进度。
- **适用场景**：`Polish Full`（全文润色）和 `Analysis`（深度分析点评）。

---

## 7. 非功能需求

### 7.1 性能要求
- 页面首屏加载 < 3s
- AI 响应时间 < 30s
- 支持并发用户 > 100

### 7.2 安全要求
- API Key 不暴露在前端（生产环境）
- 支持速率限制（每分钟 10 次/IP）
- 输入内容过滤（防止注入）
- **隐私声明**：明确提示用户简历仅用于 AI 分析，分析完成后立即从内存释放，不进行持久化存储或第三方共享。

### 7.3 兼容性
- 浏览器：Chrome、Firefox、Safari、Edge 最新版
- 设备：PC、平板、手机

---

## 8. 项目结构

### 8.1 前端项目结构

```
src/
├── components/
│   ├── ui/                      # 基础 UI 组件 (shadcn)
│   ├── resume-templates/        # 简历导出模板
│   ├── AnalysisResult.tsx       # 分析结果
│   ├── ATSMeter.tsx             # ATS 评分
│   ├── CommentCard.tsx          # AI 点评卡片
│   ├── FileUploader.tsx         # 文件上传组件
│   ├── IndustrySelector.tsx     # 行业选择
│   ├── InterviewPredictor.tsx   # 面试问题预测
│   ├── JDMatcher.tsx            # 职位匹配
│   ├── PolishEditor.tsx         # 润色编辑器（左右对比）
│   ├── RadarChart.tsx           # 雷达图
│   ├── ResumeExporter.tsx       # 简历导出
│   ├── ResumeInput.tsx          # 简历输入
│   ├── ScoreDisplay.tsx         # 分数展示
│   └── Footer.tsx               # 页脚
├── hooks/
│   └── useResumeAI.ts           # AI 功能 Hook
├── lib/
│   ├── api.ts                   # API 请求封装
│   ├── constants.ts             # 行业配置常量
│   └── utils.ts                 # 工具函数
├── pages/
│   ├── Index.tsx                # 主页面
│   └── NotFound.tsx             # 404 页面
└── App.tsx                      # 应用入口
```

### 8.2 后端项目结构

详见 5.5 节后端项目结构。

---

## 9. 开发里程碑

### Phase 1: 基础框架
- [ ] 项目初始化（前端 Vite + 后端 .NET 10）
- [ ] UI 组件库搭建
- [ ] 路由配置
- [ ] 行业选择页面

### Phase 2: 核心功能
- [ ] 简历文件导入（PDF/Word 解析）
- [ ] 简历分析功能
- [ ] 全文润色功能
- [ ] 职位匹配功能
- [ ] 面试问题预测功能

### Phase 3: 导出与优化
- [ ] 简历模板设计
- [ ] PDF 导出功能
- [ ] 性能优化
- [ ] 移动端适配

### Phase 4: 上线准备
- [ ] 后端 API 部署
- [ ] 安全加固
- [ ] 监控与日志
- [ ] 用户反馈收集

---

## 10. 附录

### 10.1 完整行业配置

详见 `src/lib/constants.ts`

### 10.2 参考设计

- 原项目 GitHub: https://github.com/Anarkh-Lee/resume-alchemist
- 设计风格参考：现代 SaaS 产品、AI 工具类产品

---

*文档版本: 1.0*
*更新日期: 2026-01-12*
