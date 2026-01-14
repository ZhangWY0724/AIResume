# 简历炼金术 (Resume Alchemist)

一款基于 AI 的智能简历优化工具，帮助求职者打造更具竞争力的简历。

## 核心功能

- **智能分析** - AI 全面分析简历质量，给出量化评分和六维能力雷达图
- **专业润色** - 基于 STAR 法则优化简历内容，支持流式输出
- **职位匹配** - 对比 JD 关键词，提供精准优化建议
- **面试预测** - 基于简历内容预测可能的面试问题
- **简历导出** - 支持多种模板 PDF 导出

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- shadcn/ui + Radix UI
- Framer Motion
- TanStack Query

### 后端
- .NET (ASP.NET Core Web API)
- 智谱 AI GLM-4 大模型
- Serilog 日志
- FluentValidation

## 快速开始

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 http://localhost:5173

### 后端

```bash
cd ResumeAlchemist/src/ResumeAlchemist.Api
dotnet run
```

后端 API 文档访问 http://localhost:5000/swagger

## 项目结构

```
AIResume/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   ├── pages/              # 页面
│   │   ├── hooks/              # 自定义 Hooks
│   │   └── lib/                # 工具函数
│   └── package.json
│
└── ResumeAlchemist/            # 后端项目
    └── src/
        ├── ResumeAlchemist.Api/           # Web API
        ├── ResumeAlchemist.Core/          # 核心业务逻辑
        ├── ResumeAlchemist.Infrastructure/ # 基础设施 (AI 服务)
        └── ResumeAlchemist.Shared/        # 共享模型
```

## 配置

后端需要配置智谱 AI API Key，在 `appsettings.json` 中设置：

```json
{
  "ZhipuAI": {
    "BaseUrl": "https://open.bigmodel.cn/api/paas/v4/",
    "ApiKey": "your-api-key",
    "Model": "glm-4"
  }
}
```

## License

MIT

## 项目说明
本项目参考下列项目进行了功能重构和样式重构。
https://github.com/Anarkh-Lee/resume-alchemist
