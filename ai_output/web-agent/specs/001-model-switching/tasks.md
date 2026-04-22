# Tasks: 模型切换功能

**Feature**: 模型切换功能
**Branch**: `001-model-switching`
**Generated**: 2026-04-22
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Overview

本任务清单基于规格说明和实施计划，将实现工作分解为可执行的任务单元。

## Task Summary

| 统计项 | 数量 |
|--------|------|
| 总任务数 | 18 |
| 已完成 | 18 |
| Phase 1 (Setup) | 3 |
| Phase 2 (Foundational) | 3 |
| Phase 3 (US1: 模型缓存与刷新) | 3 |
| Phase 4 (US2: 搜索过滤) | 2 |
| Phase 5 (US3: 模型切换) | 3 |
| Phase 6 (US4: 默认模型) | 2 |
| Phase 7 (US5: 会话覆盖) | 1 |
| Phase 8 (Polish) | 1 |

---

## Phase 1: Setup

项目初始化和准备工作。

- [x] T001 创建后端模型列表 API 路由文件 `server/src/routes/models.ts`
- [x] T002 [P] 创建前端 API 调用函数 `client/src/api/models.ts`
- [x] T003 [P] 创建 ModelSelector 组件骨架 `client/src/components/ModelSelector.vue`

---

## Phase 2: Foundational

数据库变更和 API 端点实现（所有用户故事的前置条件）。

- [x] T004 修改 SQLite 数据库 services 表增加 model 字段，迁移脚本添加 `ALTER TABLE sessions ADD COLUMN model TEXT DEFAULT 'gpt-3.5-turbo'`
- [x] T005 实现 `GET /api/models` 端点，在 `server/src/routes/models.ts` 中，从配置的 API 端点获取模型列表
- [x] T006 实现 `PUT /api/sessions/:id/model` 端点，更新会话的模型字段

---

## Phase 3: User Story 1 - 模型列表缓存与刷新

**Story Goal**: 用户点击模型选择器时，系统优先使用浏览器缓存的模型列表。首次使用或用户手动刷新时才从 API 拉取。

**Independent Test**: 点击模型选择器打开下拉列表，验证模型列表显示；点击刷新按钮，验证重新拉取数据。

**Tasks**:

- [x] T007 [US1] [P] 在 `ModelSelector.vue` 中实现 localStorage 缓存逻辑，Key 为 `web-agent:model-cache`，存储 `{ models: [], cachedAt: '' }`
- [x] T008 [US1] 在 `ModelSelector.vue` 中实现刷新按钮点击处理，强制重新从 API 获取模型列表并更新缓存
- [x] T009 [US1] 在 `ModelSelector.vue` 中实现首次加载逻辑，无缓存时显示加载状态并调用 API

---

## Phase 4: User Story 2 - 搜索过滤模型列表

**Story Goal**: 用户可以在模型列表中通过搜索框输入关键词，系统实时过滤显示匹配的模型。

**Independent Test**: 打开模型选择器，在搜索框输入 "gpt"，验证列表只显示包含 "gpt" 的模型。

**Tasks**:

- [x] T010 [US2] [P] 在 `ModelSelector.vue` 中添加搜索输入框组件
- [x] T011 [US2] 实现搜索过滤逻辑，使用 JavaScript `filter()` 对模型列表进行大小写不敏感匹配

---

## Phase 5: User Story 3 - 切换当前会话使用的模型

**Story Goal**: 用户可以选择当前会话使用的模型，选中的模型会用于后续的消息发送。

**Independent Test**: 从模型列表选择 "gpt-4"，发送消息，验证 AI 使用了新选择的模型。

**Tasks**:

- [x] T012 [US3] [P] 修改 `client/src/stores/session.ts` 中的 Session 接口，增加 `model` 字段
- [x] T013 [US3] 修改 `client/src/stores/session.ts`，在创建新会话时从 settings 获取默认模型并赋值
- [x] T014 [US3] 在 `ModelSelector.vue` 中实现模型选择事件，选中后更新当前会话的模型

---

## Phase 6: User Story 4 - 新会话使用默认模型

**Story Goal**: 创建新会话时，自动使用设置中定义的默认模型。

**Independent Test**: 在设置中配置默认模型 "claude-3"，创建新会话，验证新会话使用了该默认模型。

**Tasks**:

- [x] T015 [US4] 修改 `client/src/api/rest.ts` 中 `createSession` 函数，接收 model 参数并发送到后端
- [x] T016 [US4] 修改 `client/src/stores/session.ts` 中 `createSession` 函数，传递默认模型

---

## Phase 7: User Story 5 - 单独会话模型覆盖默认设置

**Story Goal**: 用户可以为单独会话选择不同于默认设置的模型。

**Independent Test**: 修改单个会话的模型后发送消息，验证该会话使用新选择的模型。

**Tasks**:

- [x] T017 [US5] 确保 `PUT /api/sessions/:id/model` 端点正确保存模型选择到数据库

---

## Phase 8: Polish & Cross-Cutting Concerns

收尾工作。

- [x] T018 集成 ModelSelector 组件到 `client/src/components/ChatWindow.vue`，在聊天界面顶部显示模型选择器

---

## Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational) ──────────────────┐
    │                                       │
    ▼                                       │
Phase 3 (US1: 缓存与刷新)                  │
    │                                       │
    ├──► Phase 4 (US2: 搜索过滤) ─────────┤
    │                                       │
    ▼                                       │
Phase 5 (US3: 模型切换)                     │
    │                                       │
    ├──► Phase 6 (US4: 默认模型) ─────────┤
    │                                       │
    ├──► Phase 7 (US5: 会话覆盖) ─────────┤
    │                                       │
    ▼                                       │
Phase 8 (Polish) ◄─────────────────────────┘
```

---

## Parallel Execution Examples

### 可并行任务

1. **Phase 1 中的 T002 和 T003**: 前端 API 函数和组件骨架可以并行开发
2. **Phase 3 中的 T007 和 Phase 5 中的 T012**: 缓存逻辑和 Session 类型修改可并行
3. **Phase 4 中的 T010 和 Phase 5 中的 T013**: 搜索框和 createSession 修改可并行

### 执行顺序建议

```
并行组 A:
  - T002 (前端 API)
  - T003 (组件骨架)

↓

Phase 2 (必须串行):
  - T004 (数据库)
  - T005 (后端 API)
  - T006 (更新端点)

↓

并行组 B:
  - T007 (缓存逻辑)
  - T012 (Session 类型)
  - T015 (createSession 修改)
  - T016 (store createSession)

↓

Phase 5-7 (串行，依赖 Phase 2 和并行组 B):
  - T008 (刷新按钮)
  - T009 (首次加载)
  - T010 (搜索框)
  - T011 (搜索逻辑)
  - T013 (模型选择)
  - T014 (模型选择事件)
  - T017 (会话覆盖)

↓

Phase 8:
  - T018 (集成到 ChatWindow)
```

---

## MVP Scope

建议首先实现以下任务组合作为 MVP：

| Task | Description | Reason |
|------|-------------|--------|
| T004 | 数据库变更 | 后端基础 |
| T005 | GET /api/models | 后端核心功能 |
| T007 | 缓存逻辑 | 前端核心功能 |
| T009 | 首次加载 | 用户可见功能 |
| T012 | Session 类型修改 | 前端基础 |
| T014 | 模型选择事件 | 核心交互 |
| T018 | 集成到 ChatWindow | 最终集成 |

**MVP 可独立测试**: 打开模型选择器 → 显示加载状态 → 显示模型列表 → 选择模型 → 模型切换完成

---

## Implementation Strategy

### 增量交付

1. **先完成 Phase 1-2**: 建立基础架构
2. **先实现 MVP 组合**: 核心功能可用
3. **渐进增加功能**:
   - US1 (T007-T009) → 模型列表显示
   - US2 (T010-T011) → 搜索功能
   - US3 (T012-T014) → 模型切换
   - US4 (T015-T016) → 默认模型
   - US5 (T017) → 会话覆盖
4. **最后集成**: Phase 8

### 测试策略

每个用户故事完成后应能独立测试：
- US1: 缓存机制正常工作
- US2: 搜索正确过滤
- US3: 模型正确切换并发送消息
- US4: 新会话使用默认模型
- US5: 会话模型独立于全局设置
