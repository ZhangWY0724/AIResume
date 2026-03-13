# AIResume 简历模板编辑器自研方案

## 1. 文档目标

本文档用于指导后续 AI 或开发者，在当前 `AIResume` 项目中自研一套“简历模板编辑器”能力，而不是继续强行接入 `newsume`。

目标是：

1. 充分理解 `newsume` 的功能与实现方法
2. 提炼值得借鉴的能力模型
3. 避免直接复用其工程结构带来的维护负担
4. 在当前 `frontend + ResumeAlchemist` 架构内实现统一产品体验

结论先行：

**`newsume` 值得借鉴的是产品能力、交互结构和数据模型，不值得直接作为接入目标继续打补丁。**

---

## 2. 为什么不继续接入 `newsume`

### 2.1 本质问题

`newsume` 不是一个“模板组件库”，而是一个完整的独立产品。它具备自己的：

- 状态管理
- 模板系统
- 编辑器系统
- 本地存储方案
- 打印方案
- i18n 体系
- UI 组件栈
- 页面壳结构

而你当前项目 `frontend` 也是一个完整产品，具备自己的：

- 上传与解析业务
- AI 分析业务
- AI 润色业务
- JD 匹配业务
- 面试预测业务
- 现有导出链路
- 自己的页面流转和设计语言

两者是两个产品，不是一主一辅的组件关系。

### 2.2 继续接入的代价

如果继续做“无损接入”，会长期承担以下问题：

- 数据模型不一致：`resumeContent` vs `ResumeConfig`
- UI 风格不一致：你自己的站点风格 vs `newsume` 的编辑器风格
- 工程结构不一致：两个独立前端的依赖与构建方式不同
- 可维护性差：后续上游更新难同步
- 产品体验割裂：用户感知像两个系统拼起来

### 2.3 更合理的路线

正确方向是：

**在你自己的 `frontend` 中，自研一套模板编辑器模块，复用现有 AI 业务链，借鉴 `newsume` 的功能与实现思路。**

---

## 3. `newsume` 项目功能拆解

基于对 `newsume` 当前代码的分析，它提供的核心能力可以分为 5 类。

### 3.1 结构化简历配置

核心类型在：

- `newsume/src/types/resume.ts`

它的 `ResumeConfig` 表达了一个结构化简历：

- `profile`
- `educationList`
- `workExpList`
- `projectList`
- `skillList`
- `awardList`
- `workList`
- `aboutme`
- `moduleHidden`
- `moduleLayout`
- `titleNameMap`

这说明它不是“富文本文档编辑器”，而是“结构化配置驱动的模板渲染器”。

这个思路非常值得借鉴。

### 3.2 模板渲染引擎

核心在：

- `newsume/src/components/Resume/index.tsx`
- `newsume/src/components/Resume/types.ts`
- `newsume/src/components/Resume/templates/*`

特点：

- 模板定义抽象为 `TemplateDefinition`
- 模板只负责提供：
  - `id`
  - 默认布局
  - 视觉 tokens
  - 布局壳 `LayoutShell`
- 共享模块能力复用，模板主要控制视觉差异和布局壳

这说明它的模板体系不是“复制 4 套页面”，而是“同一批模块 + 模板壳 + 风格 token”。

这个思路也值得借鉴。

### 3.3 编辑器系统

核心在：

- `newsume/src/components/Editor/index.tsx`
- `newsume/src/components/Editor/schemas.ts`
- `newsume/src/components/Editor/FormCreator.tsx`
- `newsume/src/components/Editor/ListEditor.tsx`
- `newsume/src/components/Editor/AvatarEditor.tsx`

特点：

- 不是直接编辑 DOM
- 是围绕 `ResumeConfig` 做字段级编辑
- 用 schema 驱动表单
- 列表模块可排序
- 模块可隐藏
- 模块标题可自定义
- 模块图标可配置

这是一个“结构化字段编辑器”，不是传统的简历文本编辑器。

### 3.4 排版与分页能力

核心在：

- `newsume/src/utils/pagination.ts`
- `newsume/src/components/Resume/index.tsx`

特点：

- 先完整渲染一份隐藏 DOM
- 再做尺寸测量
- 最后按模块和条目分配分页
- 分页不是简单 CSS 分页，而是内容切片分页

这个实现很有参考价值，但不建议第一期完整照搬。

### 3.5 工具栏与导出链路

核心在：

- `newsume/src/components/Toolbar/FloatingToolbar.tsx`
- `newsume/src/components/Toolbar/AppearanceDrawer.tsx`

特点：

- 工具栏负责：
  - 打开编辑器
  - 保存
  - 打印
  - 调整外观
- 导出依赖 `window.print()`
- 排版目标是浏览器打印高保真

这个方向适合模板简历导出，但需要与你现有 PDF 导出链路分工。

---

## 4. `newsume` 的实现方法中，哪些值得借鉴

### 4.1 值得借鉴的

#### 1. 结构化配置驱动

不要把模板编辑器做成“在一大段文本上直接改”。

应改为：

- 后端或前端先把简历内容结构化
- 前端基于结构化模型编辑
- 模板只消费结构化数据

#### 2. 模板抽象层

每个模板不应该是一个完全孤立的大组件。

建议自研时保留类似抽象：

- 模板定义
- 共享模块
- 模板壳
- 样式 token

#### 3. Schema 驱动编辑器

编辑器不应该手写一堆 if/else 表单。

建议自研时：

- 基于 schema 描述字段
- 基于 schema 渲染表单
- 列表模块用统一编辑器

#### 4. 模块化布局能力

支持：

- 模块显示/隐藏
- 模块排序
- 模块分栏布局

这是模板编辑器的核心竞争力之一。

#### 5. 打印导向的设计

模板页面不是普通网页，必须从一开始就按 A4 打印产物设计。

### 4.2 不建议照搬的

#### 1. 它的整个工程壳

不建议直接照搬：

- 它的 store 结构
- 它的页面壳
- 它的本地存储模型
- 它的 demo API 方案

#### 2. 它的全量 UI 风格

你的产品当前有自己的设计语言，模板编辑器应该融入你的站点，而不是变成另一个站点。

#### 3. 它的本地优先存储方式

你已经有后端与 AI 业务链，新的模板编辑器应该服务于整条业务线，而不是继续用纯本地 demo 方式为主。

#### 4. 它的完整分页实现

分页算法复杂度较高，建议分阶段落地：

- 第一期：先单页或浏览器原生打印
- 第二期：再做精细分页

---

## 5. 结合当前项目，建议自研的目标产品

### 5.1 产品定位

在当前 `frontend` 中新增一个新的业务模块：

**模板简历编辑器**

它位于当前主链路之后：

```text
上传简历
-> AI 分析
-> AI 润色
-> 生成结构化简历
-> 模板编辑器
-> 导出最终简历
```

### 5.2 与当前功能的关系

#### 当前 `frontend`

保留现有能力：

- 上传
- 分析
- 润色
- 匹配
- 面试预测

#### 新增模板编辑器模块

新增能力：

- 模板选择
- 结构化字段编辑
- 模块排序
- 模块显示隐藏
- 模板配色与间距控制
- 打印导出

### 5.3 推荐产品入口

建议在两个位置提供入口：

#### 主入口

润色完成页：

- “生成模板简历”

#### 次入口

分析结果页：

- “跳过润色，直接做模板简历”

---

## 6. 自研方案总体架构

### 6.1 架构目标

保持一个前端产品、一个后端服务，不引入第二个子应用。

### 6.2 推荐架构

```text
frontend
  ├── AI 业务流
  ├── 模板编辑器页面
  ├── 模板渲染模块
  ├── 编辑器模块
  └── 打印导出模块

ResumeAlchemist
  ├── 现有 AI 接口
  ├── 结构化简历生成接口
  ├── 模板草稿保存接口
  └── 模板导出辅助接口（可选）
```

### 6.3 关键原则

- 一个前端，统一路由
- 一个状态树，统一上下文
- 一个后端，统一草稿与 AI 服务
- 模板编辑器是主项目的一个功能模块，不是独立站点

---

## 7. 自研数据模型设计

建议引入三层模型，不要直接把文本和模板配置揉成一层。

### 7.1 `ResumeSource`

表示原始简历输入。

```ts
interface ResumeSource {
  rawText: string;
  polishedText?: string;
  fileName?: string;
  fileType?: string;
  industryId?: string;
}
```

### 7.2 `StructuredResume`

表示与模板无关的结构化简历数据。

```ts
interface StructuredResume {
  profile: {
    name?: string;
    mobile?: string;
    email?: string;
    birthday?: string;
    positionTitle?: string;
    workPlace?: string;
    workExpYear?: string;
    customFields?: Array<{ key: string; value: string }>;
  };
  education: Array<...>;
  workExperience: Array<...>;
  projects: Array<...>;
  skills: Array<...>;
  awards: Array<...>;
  works: Array<...>;
  summary?: string;
  warnings?: string[];
}
```

### 7.3 `ResumeEditorConfig`

表示模板编辑器真正消费的数据。

这个模型建议参考 `newsume.ResumeConfig`，但不要完全照抄命名，可以更贴合你自己的业务语义。

建议结构：

```ts
interface ResumeEditorConfig {
  templateId: string;
  themeId: string;
  layout: {
    sidebarModules: string[];
    mainModules: string[];
    hiddenModules: Record<string, boolean>;
  };
  appearance: {
    pageMargin: 'compact' | 'standard' | 'spacious';
    moduleGap: 'compact' | 'standard' | 'spacious';
    lineHeight: 'compact' | 'standard' | 'spacious';
    privacyMode: boolean;
  };
  content: StructuredResume;
}
```

### 7.4 为什么不用 `newsume` 原模型直接照搬

因为你现在是自研，不是兼容它。

建议：

- 吸收它的建模思路
- 字段名按你自己的系统统一
- 为未来 AI 回流、草稿版本管理预留更清晰空间

---

## 8. 前端模块设计

### 8.1 新增路由

在当前 [App.tsx](D:/mycode/AIResume/frontend/src/App.tsx) 中新增：

```text
/editor
```

页面名建议：

- `frontend/src/pages/ResumeEditor.tsx`

### 8.2 页面结构

建议页面结构如下：

```text
ResumeEditor
├── EditorHeader
├── ResumeCanvas
├── FloatingToolbar
├── EditorDrawer
└── ExportPreviewModal（可选）
```

### 8.3 模块拆分建议

#### 页面层

- `pages/ResumeEditor.tsx`

#### 编辑器组件层

- `components/editor/EditorDrawer.tsx`
- `components/editor/FormRenderer.tsx`
- `components/editor/ListSectionEditor.tsx`
- `components/editor/ProfileEditor.tsx`
- `components/editor/ModuleOrderEditor.tsx`
- `components/editor/AppearancePanel.tsx`

#### 模板渲染层

- `components/resume-editor/ResumeCanvas.tsx`
- `components/resume-editor/templates/*`
- `components/resume-editor/modules/*`
- `components/resume-editor/template-types.ts`

#### 状态层

- `store/useResumeEditorStore.ts`

#### 数据层

- `lib/resume-editor/types.ts`
- `lib/resume-editor/mappers.ts`
- `lib/resume-editor/schemas.ts`
- `lib/resume-editor/templates.ts`

---

## 9. 自研模板系统设计

### 9.1 模板抽象

建议保留与 `newsume` 类似的思想，但简化实现。

```ts
interface ResumeTemplateDefinition {
  id: string;
  name: string;
  defaultLayout: {
    sidebarModules: string[];
    mainModules: string[];
  };
  getTokens: () => ResumeTemplateTokens;
  Shell: React.ComponentType<ResumeShellProps>;
}
```

### 9.2 第一阶段模板数量

不要一开始就做很多模板。

建议一期只做 2 套：

1. `professional-two-column`
2. `ats-single-column`

理由：

- 足够验证架构
- 控制工作量
- 便于后续继续扩展

### 9.3 共享模块

建议把以下模块做成共享模块：

- `ProfileModule`
- `EducationModule`
- `WorkExperienceModule`
- `ProjectModule`
- `SkillModule`
- `AwardModule`
- `WorksModule`
- `SummaryModule`

模板只负责：

- 外层布局壳
- token 差异
- 模块标题样式
- 部分视觉变体

---

## 10. 编辑器系统设计

### 10.1 编辑方式

不要做“整页内容直接可编辑”。

应做成：

- 左侧或右侧 Drawer 表单编辑
- 中间简历画布实时预览
- 工具栏控制模板和外观

### 10.2 表单驱动

建议引入 schema 驱动方式。

例如：

```ts
interface EditorSchemaField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'richtext' | 'slider' | 'switch';
  placeholder?: string;
}
```

每个模块一个 schema：

- `profileSchema`
- `educationSchema`
- `workExperienceSchema`
- `projectSchema`
- `skillSchema`

这样可以避免表单逻辑散落在组件中。

### 10.3 一期建议支持的编辑能力

必须支持：

- 个人信息编辑
- 教育经历增删改
- 工作经历增删改
- 项目经历增删改
- 技能编辑
- 自我评价编辑
- 模块显示/隐藏
- 模块排序

一期可以不做：

- 模块自定义图标
- 模块标题国际化改名
- 富文本高级工具栏

---

## 11. 状态管理设计

当前已有 [useResumeStore.ts](D:/mycode/AIResume/frontend/src/store/useResumeStore.ts)，主要服务 AI 业务流程。

建议新增一个编辑器专用 store：

- `frontend/src/store/useResumeEditorStore.ts`

### 11.1 推荐状态内容

```ts
interface ResumeEditorState {
  draft: ResumeEditorConfig | null;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  activePanel: 'profile' | 'education' | 'work' | 'project' | 'skill' | 'appearance' | null;
  setDraft: ...
  updateContent: ...
  updateAppearance: ...
  reorderModules: ...
  toggleModule: ...
  loadDraft: ...
  saveDraft: ...
}
```

### 11.2 与现有 store 的关系

- `useResumeStore`：继续承载 AI 流程上下文
- `useResumeEditorStore`：承载模板编辑器状态

不要把两者硬塞成一个 store。

---

## 12. 后端方案

### 12.1 需要新增的能力

后端不需要完整复制 `newsume` 的本地存储模式，但必须新增两类能力：

#### 1. 文本转结构化简历

例如：

`POST /api/editor/structure`

输入：

- `rawText`
- `polishedText`
- `industryId`

输出：

- `StructuredResume`

#### 2. 编辑器草稿保存

例如：

- `POST /api/editor/drafts`
- `GET /api/editor/drafts/{draftId}`
- `PUT /api/editor/drafts/{draftId}`

### 12.2 推荐后端职责

后端负责：

- 草稿存储
- 结构化转换
- 头像资源存储

前端负责：

- 模板渲染
- 排版预览
- 打印导出

### 12.3 一期结构化策略

建议先实现“最小可用结构化”：

- 姓名
- 手机号
- 邮箱
- 个人总结
- 教育/工作/项目基础分段

然后用户进入编辑器手动补齐。

不要第一期就追求 100% 自动结构化。

---

## 13. 导出方案

### 13.1 推荐双轨制

#### 保留现有导出

当前 `frontend` 的后端 PDF 导出继续保留，用于：

- AI 润色文本的快速导出

#### 新增模板导出

模板编辑器导出采用：

- `window.print()`
- 专用打印样式

### 13.2 原因

因为模板编辑器的输出本质上是“精确排版页面”，浏览器打印更合适。

不要第一期就做后端模板 PDF 渲染。

---

## 14. 建议实施顺序

### 阶段 1：建模与路由

目标：

- 明确编辑器数据结构
- 在 `frontend` 中建立 `/editor` 路由和基本页面壳

任务：

1. 定义 `StructuredResume`
2. 定义 `ResumeEditorConfig`
3. 新增 `ResumeEditor` 页面
4. 新增 `useResumeEditorStore`

### 阶段 2：后端结构化接口

目标：

- 让 AI 产物可以进入模板编辑器

任务：

1. 新增 `POST /api/editor/structure`
2. 新增草稿保存接口
3. 新增草稿读取接口

### 阶段 3：模板渲染层

目标：

- 先渲染出两套模板

任务：

1. 搭建 `TemplateDefinition`
2. 实现 2 套模板
3. 实现共享模块组件

### 阶段 4：编辑器表单层

目标：

- 完成字段编辑、模块排序、模块隐藏

任务：

1. schema 驱动表单
2. 列表编辑器
3. 模块排序
4. 外观设置

### 阶段 5：导出与体验收口

目标：

- 打印导出可用
- 页面体验闭环

任务：

1. 打印样式
2. 自动保存
3. 加载与错误提示
4. 从润色页跳转进入编辑器

---

## 15. 对当前项目的直接开发建议

### 15.1 新增目录建议

```text
frontend/src/
├── pages/
│   └── ResumeEditor.tsx
├── components/
│   └── resume-editor/
│       ├── templates/
│       ├── modules/
│       ├── editor/
│       └── shared/
├── store/
│   └── useResumeEditorStore.ts
└── lib/
    └── resume-editor/
        ├── types.ts
        ├── schemas.ts
        ├── mappers.ts
        └── templates.ts
```

### 15.2 与现有页面的衔接

建议从这两个页面进入新编辑器：

- [AnalysisResult.tsx](D:/mycode/AIResume/frontend/src/pages/AnalysisResult.tsx)
- [ResumePolish.tsx](D:/mycode/AIResume/frontend/src/pages/ResumePolish.tsx)

优先主入口：

- 润色完成后进入模板编辑器

### 15.3 当前项目已有可复用资产

可以直接复用：

- 路由体系
- API 封装方式
- Toast 与错误处理
- 页面视觉语言
- `zustand` 状态管理方式
- 现有 AI 上下文数据

---

## 16. 一期范围边界

### 16.1 一期必须做

- `StructuredResume` 建模
- `/editor` 页面
- 2 套模板
- 6-8 个基础模块
- 结构化字段编辑
- 模块排序与隐藏
- 浏览器打印导出
- 从润色页进入编辑器

### 16.2 一期不做

- 多语言模板
- 模块自定义图标
- 复杂富文本工具栏
- 智能分页切片算法
- 模板市场
- 多版本历史
- 团队协作

---

## 17. 给后续 AI 的执行说明

后续 AI 开发必须遵守以下规则：

1. 不再继续做 `newsume` 接入改造
2. `newsume` 仅作为参考代码，不作为目标运行时
3. 所有新能力必须落在 `frontend` 当前项目结构内
4. 优先复用当前 `frontend` 的 UI 风格与交互风格
5. 后端新增能力必须服务于当前主项目，而不是兼容 `newsume` 本地 API
6. 模板系统优先做最小可用版本，不提前实现复杂分页
7. 数据模型优先保持清晰，不为了兼容开源项目做字段迁就

---

## 18. 结论

对当前项目而言，最合理的路线不是“继续接入 `newsume`”，而是：

- 吸收 `newsume` 的功能设计与实现思路
- 在自己的主项目中自研模板编辑器
- 让模板编辑器成为现有 AI 简历业务链的一部分

这是在一致性、可维护性、扩展性和开发控制权之间最优的选择。
