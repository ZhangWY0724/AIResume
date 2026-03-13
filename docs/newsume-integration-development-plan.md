# newsume 无损集成开发方案

## 1. 文档目标

本方案用于指导后续 AI 或开发者，将开源简历模板前端 `newsume` 无损集成到当前 `AIResume` 项目中，形成一条完整的业务链：

1. 上传或粘贴简历
2. AI 分析
3. AI 润色
4. 生成结构化简历草稿
5. 进入 `newsume` 模板编辑器
6. 调整模板与样式
7. 导出最终简历

本方案强调以下原则：

- 无损集成：不直接破坏 `newsume` 模板引擎与编辑器内核
- 业务分层：AI 业务与模板业务解耦
- 渐进实施：先打通业务，再考虑工程统一
- 易于维护：后续可继续同步 `newsume` 上游更新

## 2. 当前项目现状

### 2.1 仓库结构

```text
AIResume/
├── frontend/              # 现有 AI 简历业务前端
├── newsume/               # 新引入的开源模板前端
├── ResumeAlchemist/       # .NET 后端
├── PRD.md
└── README.md
```

### 2.2 现有职责边界

#### `frontend`

定位：AI 简历业务前台

现有能力：

- 简历上传与解析
- 行业选择
- AI 分析
- AI 润色
- JD 匹配
- 面试预测
- 当前 PDF 导出

核心特点：

- 数据以纯文本 `resumeContent` 为主
- 与后端 `ResumeController` 已经打通
- 是当前产品主业务入口

#### `newsume`

定位：结构化简历编辑器 + 模板渲染器 + 本地打印导出器

现有能力：

- 结构化字段编辑
- 多模板切换
- 外观控制
- 隐私模式
- 自动分页
- 浏览器打印导出
- 本地 JSON 读写

核心特点：

- 数据以结构化 `ResumeConfig` 为核心
- 当前通过 `vite.config.ts` 提供本地 `/api/resume` 假接口
- 是一个完整的独立前端应用

#### `ResumeAlchemist`

定位：统一后端服务

现有能力：

- `POST /api/Resume/import`
- `POST /api/Resume/analyze`
- `POST /api/Resume/analyze-stream`
- `POST /api/Resume/polish-stream`
- `POST /api/Resume/match`
- `POST /api/Resume/interview`
- `POST /api/Resume/export/pdf`

当前缺失：

- 结构化简历草稿接口
- `newsume` 需要的配置读写接口
- 文本到模板配置的转换接口

## 3. 目标架构

采用“双前端子应用 + 统一后端 + 结构化转换层”的渐进式集成方案。

### 3.1 架构图

```text
用户
  -> frontend
     -> 上传/粘贴简历
     -> AI 分析
     -> AI 润色
     -> 创建结构化草稿
     -> 跳转 newsume 编辑器

  -> newsume
     -> 读取结构化草稿
     -> 编辑模板配置
     -> 自动保存
     -> 打印导出

ResumeAlchemist
  -> AI 业务接口
  -> 结构化草稿接口
  -> 文本转结构化服务
  -> 草稿资源存储
```

### 3.2 核心职责划分

#### `frontend`

负责：

- 业务流程编排
- AI 能力调用
- 将用户引导进入模板编辑器

不负责：

- 模板编辑内核
- 结构化模板渲染

#### `newsume`

负责：

- 结构化简历展示与编辑
- 模板切换
- 外观控制
- 打印导出

不负责：

- AI 分析
- AI 润色
- 简历原始解析

#### 后端

负责：

- 草稿持久化
- 文本转结构化简历
- `ResumeConfig` 读写接口
- 头像资源存储

## 4. 集成策略

## 4.1 总体原则

必须遵守以下规则：

1. 不直接把 `newsume/src` 合并进 `frontend/src`
2. 不把 `newsume` 的本地假接口作为正式生产方案
3. 不让两个前端共享 Zustand store
4. 不在第一阶段统一依赖与工程结构
5. 不把文本转结构化逻辑写在页面组件里

### 4.2 推荐接入方式

推荐使用“子路径接入”。

#### 方案

- 主业务站：`/`
- 模板编辑器：`/editor/*`
- 统一 API：`/api/*`

#### 理由

- 用户感知是一个产品
- 鉴权、Cookie、埋点处理更简单
- 不需要源码级硬合并
- 后续可平滑演进为 monorepo

### 4.3 部署层建议

#### 开发环境

- `frontend`：`http://localhost:5173`
- `newsume`：`http://localhost:5174`
- `ResumeAlchemist`：`http://localhost:5000`

通过开发代理统一为：

- `/` -> `frontend`
- `/editor` -> `newsume`
- `/api` -> `ResumeAlchemist`

#### 生产环境

- `frontend` 独立构建
- `newsume` 独立构建，`base` 配置为 `/editor/`
- 网关根据路径分发静态资源

## 5. 数据模型设计

当前最大问题不是 UI，而是数据模型不一致：

- `frontend` 使用纯文本简历
- `newsume` 使用结构化 `ResumeConfig`

因此必须新增中间数据层。

### 5.1 领域模型

#### `ResumeSource`

用于保存原始输入与 AI 处理结果。

```ts
export interface ResumeSource {
  sourceId: string;
  userId?: string;
  rawText: string;
  polishedText?: string;
  fileName?: string;
  fileType?: string;
  language?: 'zh-CN' | 'en-US';
  industryId?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### `StructuredResumeDraft`

用于表达与模板无关的结构化简历数据。

```ts
export interface StructuredResumeDraft {
  draftId: string;
  sourceId: string;
  profile: {
    name?: string;
    mobile?: string;
    email?: string;
    birthday?: string;
    workPlace?: string;
    positionTitle?: string;
    workExpYear?: string;
    customFields?: Array<{ key: string; value: string }>;
  };
  education: Array<{
    id: string;
    school: string;
    major?: string;
    academicDegree?: string;
    start?: string;
    end?: string;
  }>;
  workExperience: Array<{
    id: string;
    companyName: string;
    departmentName?: string;
    start?: string;
    end?: string;
    workDesc?: string;
  }>;
  projects: Array<{
    id: string;
    projectName: string;
    projectRole?: string;
    projectDesc?: string;
    projectContent?: string;
    start?: string;
    end?: string;
  }>;
  skills: Array<{
    id: string;
    skillName?: string;
    skillLevel?: number;
    skillDesc?: string;
  }>;
  awards: Array<{
    id: string;
    awardInfo: string;
    awardTime?: string;
  }>;
  works: Array<{
    id: string;
    workName?: string;
    workDesc?: string;
    visitLink?: string;
  }>;
  summary?: string;
  warnings?: string[];
  completenessScore?: number;
  createdAt: string;
  updatedAt: string;
}
```

#### `ResumeTemplateConfig`

此层直接对应 `newsume` 的 `ResumeConfig`，不另起一套字段命名。

### 5.2 数据流

```text
ResumeSource
  -> StructuredResumeDraft
  -> newsume.ResumeConfig
  -> newsume 编辑器
  -> 最终导出
```

### 5.3 设计原则

- `StructuredResumeDraft` 是领域模型
- `ResumeConfig` 是展示模型
- 转换逻辑必须集中在服务层
- 页面只消费结果，不做复杂映射

## 6. 字段映射方案

### 6.1 `StructuredResumeDraft` -> `newsume.ResumeConfig`

#### 个人信息

| Draft 字段 | ResumeConfig 字段 |
|---|---|
| `profile.name` | `profile.name` |
| `profile.mobile` | `profile.mobile` |
| `profile.email` | `profile.email` |
| `profile.birthday` | `profile.birthday` |
| `profile.workPlace` | `profile.workPlace` |
| `profile.positionTitle` | `profile.positionTitle` |
| `profile.workExpYear` | `profile.workExpYear` |
| `profile.customFields` | `profile.customFields` |

#### 教育经历

| Draft 字段 | ResumeConfig 字段 |
|---|---|
| `education[].id` | `educationList[].id` |
| `education[].school` | `educationList[].school` |
| `education[].major` | `educationList[].major` |
| `education[].academicDegree` | `educationList[].academicDegree` |
| `education[].start/end` | `educationList[].eduTime = [start, end]` |

#### 工作经历

| Draft 字段 | ResumeConfig 字段 |
|---|---|
| `workExperience[].id` | `workExpList[].id` |
| `workExperience[].companyName` | `workExpList[].companyName` |
| `workExperience[].departmentName` | `workExpList[].departmentName` |
| `workExperience[].start/end` | `workExpList[].workTime = [start, end]` |
| `workExperience[].workDesc` | `workExpList[].workDesc` |

#### 项目经历

| Draft 字段 | ResumeConfig 字段 |
|---|---|
| `projects[].id` | `projectList[].id` |
| `projects[].projectName` | `projectList[].projectName` |
| `projects[].projectRole` | `projectList[].projectRole` |
| `projects[].projectDesc` | `projectList[].projectDesc` |
| `projects[].projectContent` | `projectList[].projectContent` |
| `projects[].start/end` | `projectList[].projectTime = [start, end]` |

#### 技能、奖项、作品、个人总结

直接对应以下字段：

- `skills -> skillList`
- `awards -> awardList`
- `works -> workList`
- `summary -> aboutme.aboutmeDesc`

### 6.2 转换规则

#### 必须遵守

1. 所有列表项必须自动补充稳定 `id`
2. 缺失字段允许为空，不允许生成非法结构
3. 富文本描述统一转为 `newsume` 可接受的 HTML
4. 推测性结果要写入 `warnings`
5. 未识别字段不要强行乱填

#### 富文本建议

统一规则：

- 普通段落转 `<p>`
- 列表项转 `<ul><li>`
- 保留必要的粗体和链接
- 不引入复杂内联样式

## 7. 后端开发方案

后端是整个集成的核心枢纽。建议新增专用控制器，不要继续把全部逻辑塞进现有 `ResumeController`。

### 7.1 新增模块

建议新增以下模块：

- `ResumeAlchemist.Api/Controllers/ResumeDraftController.cs`
- `ResumeAlchemist.Core/Interfaces/IResumeDraftService.cs`
- `ResumeAlchemist.Core/Interfaces/IResumeStructuringService.cs`
- `ResumeAlchemist.Core/Services/ResumeDraftService.cs`
- `ResumeAlchemist.Core/Services/ResumeStructuringService.cs`
- `ResumeAlchemist.Shared/DTOs/ResumeDraftDto.cs`
- `ResumeAlchemist.Shared/DTOs/StructuredResumeDto.cs`

### 7.2 接口设计

#### 1. 从文本创建草稿

`POST /api/resume-drafts/from-text`

请求体：

```json
{
  "rawText": "原始简历文本",
  "polishedText": "润色后的简历文本",
  "industryId": "internet",
  "language": "zh-CN"
}
```

响应体：

```json
{
  "draftId": "draft_20260313_xxx",
  "structuredResume": {
    "draftId": "draft_20260313_xxx",
    "sourceId": "source_xxx",
    "profile": {},
    "education": [],
    "workExperience": [],
    "projects": [],
    "skills": [],
    "awards": [],
    "works": [],
    "summary": "",
    "warnings": []
  },
  "templateConfig": {
    "profile": {},
    "educationList": [],
    "workExpList": [],
    "projectList": [],
    "skillList": [],
    "awardList": [],
    "workList": [],
    "aboutme": {
      "aboutmeDesc": ""
    }
  }
}
```

#### 2. 获取草稿

`GET /api/resume-drafts/{draftId}`

响应体：

```json
{
  "draftId": "draft_20260313_xxx",
  "templateConfig": {},
  "updatedAt": "2026-03-13T15:00:00Z"
}
```

#### 3. 保存草稿

`PUT /api/resume-drafts/{draftId}`

请求体：

```json
{
  "templateConfig": {}
}
```

#### 4. 上传头像

`POST /api/resume-drafts/{draftId}/avatar`

响应体：

```json
{
  "avatarUrl": "/api/resume-drafts/draft_20260313_xxx/avatar"
}
```

#### 5. 获取头像

`GET /api/resume-drafts/{draftId}/avatar`

#### 6. 导出草稿 JSON

`GET /api/resume-drafts/{draftId}/export`

### 7.3 草稿存储方案

第一阶段采用文件存储即可，避免过度设计。

推荐目录：

```text
storage/
└── resume-drafts/
    └── {draftId}/
        ├── source.json
        ├── structured.json
        ├── config.json
        ├── meta.json
        └── avatar.png
```

#### `meta.json` 建议字段

```json
{
  "draftId": "draft_xxx",
  "sourceId": "source_xxx",
  "createdAt": "2026-03-13T15:00:00Z",
  "updatedAt": "2026-03-13T15:10:00Z",
  "language": "zh-CN",
  "industryId": "internet"
}
```

### 7.4 文本结构化服务

建议采用“规则提取 + AI 补全”的组合方案。

#### 第一层：规则提取

用于处理高确定性信息：

- 手机号
- 邮箱
- 时间区间
- 学校
- 公司
- 职位
- 常见链接

#### 第二层：AI 补全

用于处理复杂结构：

- 工作经历拆段
- 项目经历归类
- 技能归纳
- 个人总结生成
- 富文本列表化

#### 输出要求

- 输出必须是可反序列化 JSON
- 所有推测性字段写入 `warnings`
- 不允许输出无法落库的半结构化脏数据

### 7.5 错误处理要求

必须覆盖以下情况：

- 文本为空
- 草稿不存在
- JSON 序列化失败
- 图片格式不支持
- 头像大小超限
- AI 抽取失败
- 部分字段缺失

错误返回必须为统一结构：

```json
{
  "message": "错误说明",
  "code": "ERROR_CODE"
}
```

## 8. `newsume` 前端开发方案

目标：尽量少改 `newsume` 内核，只改数据接入壳层。

### 8.1 允许修改的模块

优先改这些文件：

- `newsume/src/services/resume.ts`
- `newsume/src/store/resume.ts`
- `newsume/src/App.tsx`
- `newsume/src/components/Toolbar/index.tsx`
- `newsume/vite.config.ts`

### 8.2 尽量不改的模块

为了保留上游兼容性，尽量不修改：

- `newsume/src/components/Resume/*`
- `newsume/src/components/Editor/*`
- `newsume/src/components/Resume/templates/*`
- `newsume/src/constants/*`
- `newsume/src/types/resume.ts`

### 8.3 需要实现的功能

#### 1. 支持通过 URL 读取 `draftId`

示例：

```text
/editor?draftId=draft_20260313_xxx
```

行为：

- 有 `draftId`：读取后端草稿
- 无 `draftId`：回退到本地 `data/resume.json`

#### 2. 改造 `services/resume.ts`

当前逻辑：

- 开发环境走 `/api/resume`
- 生产环境走 `/data/resume.json`

改造后逻辑：

1. 若存在 `draftId`：
   - `GET /api/resume-drafts/{draftId}`
   - `PUT /api/resume-drafts/{draftId}`
2. 若不存在 `draftId`：
   - 保留原本地 demo 逻辑

#### 3. 自动保存

保存策略建议：

- 字段变更后延迟 800ms 自动保存
- 切换模板后立即保存
- 页面关闭前尝试 flush 一次保存

要求：

- 防抖保存
- 避免并发覆盖
- 保存失败显示 toast

#### 4. 头像上传走真实接口

改造为：

- `POST /api/resume-drafts/{draftId}/avatar`
- 成功后刷新 `avatar.src`

#### 5. 工具栏增加业务壳能力

新增内容：

- 返回主站按钮
- 保存状态提示
- 当前草稿状态提示

不要保留明显的开源项目品牌露出作为主产品默认表现。

### 8.4 `newsume` 工程配置调整

#### Vite

- 增加 `base: '/editor/'`
- 保留本地开发别名配置
- 本地 `resumeApiPlugin` 仅作为 demo fallback

#### 路由

`newsume` 仍可维持单页应用，不必引入复杂业务路由。

## 9. `frontend` 前端开发方案

目标：保持现有 AI 业务流不变，只增加“进入模板编辑器”的编排能力。

### 9.1 新增用户入口

推荐主入口放在润色页：

- 页面：`frontend/src/pages/ResumePolish.tsx`
- 新按钮：`生成模板简历`

点击后流程：

1. 获取当前 `resumeContent`
2. 获取当前 `polishedContent`
3. 调用 `POST /api/resume-drafts/from-text`
4. 成功后拿到 `draftId`
5. 跳转 `/editor?draftId=xxx&from=polish`

### 9.2 可选次入口

在分析页增加次入口：

- 文案：`跳过润色，直接生成模板简历`

此入口为增强项，不作为一期必须。

### 9.3 `frontend` API 改造

在 `frontend/src/lib/api.ts` 中新增：

```ts
export interface CreateResumeDraftRequest {
  rawText: string;
  polishedText?: string;
  industryId?: string;
  language?: 'zh-CN' | 'en-US';
}

export interface CreateResumeDraftResponse {
  draftId: string;
  structuredResume: unknown;
  templateConfig: unknown;
}
```

新增方法：

- `createResumeDraftFromText`
- `getResumeDraft`
- `updateResumeDraft`

### 9.4 `frontend` store 改造

在 `useResumeStore` 中只新增轻量状态：

- `draftId?: string | null`
- `setDraftId`

不要把完整 `ResumeConfig` 放入 `frontend` store。

### 9.5 页面交互要求

点击“生成模板简历”后：

- 按钮进入 loading
- 调用失败给出错误提示
- 调用成功后直接跳转编辑器
- 若 `polishedContent` 为空，禁止进入

## 10. 用户流程设计

### 10.1 一期主流程

```text
首页
  -> 选择行业
  -> 上传/粘贴简历
  -> AI 分析
  -> AI 润色
  -> 生成模板简历
  -> newsume 编辑器
  -> 导出最终简历
```

### 10.2 一期支持的次流程

```text
上传/粘贴简历
  -> 直接生成模板简历
  -> newsume 编辑器
```

### 10.3 一期不做

以下功能不纳入一期，避免过度设计：

- 模板编辑内容反向回流 AI 再润色
- 多版本草稿历史
- 草稿协作分享
- 模板商城
- 多模板差异对比
- 完整账号体系联动

## 11. 打印与导出方案

当前存在两套导出方式。

### 11.1 保留双轨制

#### `frontend`

继续保留当前后端 PDF 导出，用于：

- AI 润色内容预览
- 纯文本/传统模板导出

#### `newsume`

使用其原生打印导出，用于：

- 结构化模板简历导出
- ATS 友好的打印输出

### 11.2 原则

不要在一期强行统一为一个 PDF 导出内核。

原因：

- 成本高
- 风险大
- 不符合 YAGNI
- `newsume` 已经具备成熟打印能力

## 12. 实施阶段拆解

### 阶段 1：接口与模型设计

目标：

- 补齐数据契约
- 产出统一接口设计

任务：

1. 定义 `ResumeSource`
2. 定义 `StructuredResumeDraft`
3. 定义 `ResumeDraft` DTO
4. 定义错误码
5. 定义 `draftId` 生成规则

交付物：

- 后端 DTO
- 接口文档
- 字段映射文档

### 阶段 2：后端草稿能力建设

目标：

- 让后端具备草稿创建、读取、保存、头像上传能力

任务：

1. 新建 `ResumeDraftController`
2. 实现文件存储
3. 实现文本结构化服务
4. 实现 `ResumeConfig` 转换器
5. 实现头像读写
6. 增加统一异常处理

交付物：

- 可联调 API
- 本地可落盘草稿

### 阶段 3：`newsume` 接后端

目标：

- `newsume` 可读取和保存真实草稿

任务：

1. 改造 `services/resume.ts`
2. 支持 URL 读取 `draftId`
3. 实现自动保存
4. 对接头像上传
5. 增加返回主站按钮

交付物：

- 可通过 `draftId` 打开的编辑器
- 可保存的模板配置

### 阶段 4：`frontend` 编排接入

目标：

- 从 AI 流程进入模板编辑器

任务：

1. API 层新增创建草稿方法
2. 润色页增加“生成模板简历”
3. 跳转 `/editor?draftId=xxx`
4. 处理 loading 与错误

交付物：

- 主业务链跑通

### 阶段 5：联调与验收

目标：

- 保证实际可用与可上线

任务：

1. 端到端联调
2. 打印样式验证
3. 头像与资源路径验证
4. 刷新与深链访问验证
5. 错误场景验证

交付物：

- 上线候选版本

## 13. 详细任务清单

### 13.1 后端任务

- 新增 `ResumeDraftController`
- 新增 `CreateResumeDraftFromTextRequest`
- 新增 `ResumeDraftResponse`
- 新增 `StructuredResumeDto`
- 新增 `ResumeConfigDto`
- 新增 `IResumeDraftService`
- 新增 `IResumeStructuringService`
- 新增 `ResumeDraftFileStore`
- 新增 `ResumeConfigMapper`
- 新增头像上传接口
- 新增头像获取接口
- 新增统一错误码
- 为草稿接口补充日志

### 13.2 `newsume` 任务

- 读取 URL 参数中的 `draftId`
- 将 `loadConfig` 改为支持远程草稿
- 将 `saveConfig` 改为支持远程保存
- 改造头像上传
- 增加自动保存状态
- 增加“返回主站”按钮
- 增加无 `draftId` 的 demo fallback
- 配置 `/editor/` base

### 13.3 `frontend` 任务

- 新增草稿 API 方法
- 在润色页增加“生成模板简历”按钮
- 成功后跳转编辑器
- 失败时显示错误
- 可选：分析页增加次入口
- 可选：store 增加 `draftId`

### 13.4 运维与部署任务

- 配置 `/editor` 静态资源路径
- 配置 `/api` 反向代理
- 配置 SPA 刷新 fallback
- 配置头像资源路径
- 配置生产环境缓存策略

## 14. 验收标准

### 14.1 功能验收

必须通过以下场景：

1. 用户上传 PDF 后可完成分析
2. 用户完成润色后可生成模板草稿
3. 跳转 `newsume` 后可正确加载草稿
4. 在 `newsume` 中修改字段后可自动保存
5. 刷新页面后数据不丢失
6. 上传头像后可正常显示
7. 切换模板后内容不丢失
8. 可成功打印导出模板简历

### 14.2 异常验收

必须覆盖以下异常：

1. 文本结构化失败时可提示用户
2. 草稿 ID 无效时可回退或提示
3. 自动保存失败时可提示并允许重试
4. 头像格式错误时可提示
5. 头像过大时可提示
6. 浏览器刷新 `/editor` 路径不出现 404

### 14.3 非功能验收

- 主业务链不被破坏
- `newsume` 模板功能不退化
- 代码职责边界清晰
- 允许后续独立升级 `newsume`

## 15. 风险与规避方案

### 风险 1：文本结构化不稳定

表现：

- 教育、工作、项目分段不准
- 技能和奖项识别错误

规避：

- 规则先抽主干字段
- AI 只做补全
- 前端展示 `warnings`
- 用户在 `newsume` 中手工修正

### 风险 2：源码级合并导致样式和依赖冲突

规避：

- 不直接合并两个前端源码
- 采用子应用接入

### 风险 3：上游模板升级困难

规避：

- 只改 `newsume` 数据接入层
- 不改模板引擎主体

### 风险 4：打印效果跨浏览器不一致

规避：

- 一期优先保证 Chrome/Edge
- 打印样式单独回归测试

## 16. 一期范围边界

### 16.1 一期必须实现

- 文本创建模板草稿
- `newsume` 读取并保存真实草稿
- `frontend` 可跳转进入编辑器
- 模板编辑与导出可用
- 头像上传可用

### 16.2 一期明确不做

- 模板编辑反向流入 AI 润色
- 多版本历史
- 团队协作
- 分享链接
- 模板商城
- 账号级云同步

## 17. 推荐开发顺序

严格按以下顺序执行：

1. 后端 DTO 与草稿接口
2. 后端文本结构化服务
3. `newsume` 远程草稿读写
4. `frontend` 生成草稿并跳转
5. 联调与导出验证

禁止一开始就做以下事情：

- 直接合并两个前端项目
- 统一所有依赖版本
- 重写 `newsume` 模板引擎
- 一次性做双向回流闭环

## 18. 给后续 AI 的执行说明

后续 AI 开发必须遵守以下约束：

1. 先实现后端草稿接口，再改前端
2. 修改 `newsume` 时只优先动壳层和服务层
3. 不破坏现有 `frontend` 的分析、润色、匹配、面试预测
4. 不删除 `newsume` 的 demo fallback，保留本地演示能力
5. 所有新增接口都必须有明确 DTO
6. 所有自动保存逻辑都必须有失败提示
7. 所有路径都以 `/editor` 为正式接入基准

## 19. 结论

本项目的正确集成方式不是“把模板前端并入现有前端”，而是：

- 保持 `frontend` 作为 AI 业务入口
- 保持 `newsume` 作为模板编辑器子应用
- 在后端新增结构化草稿能力
- 通过统一草稿接口与数据映射层打通业务闭环

这是当前仓库下最稳妥、最可维护、最符合无损集成要求的方案。
