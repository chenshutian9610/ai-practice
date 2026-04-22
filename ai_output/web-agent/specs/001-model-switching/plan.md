# Implementation Plan: 模型切换功能

**Branch**: `001-model-switching` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-model-switching/spec.md`

## Summary

在聊天界面增加模型选择器功能，支持：
1. 模型列表缓存机制（首次实时查询，后续使用浏览器缓存）
2. 模型搜索过滤功能
3. 手动刷新按钮重新拉取模型列表
4. 设置中的模型配置改为默认模型
5. 新会话使用默认模型

## Technical Context

**Language/Version**: TypeScript (strict mode backend, standard mode frontend)
**Primary Dependencies**: Vue 3 (Composition API), Pinia, Express.js, SQLite, Vitest, Playwright
**Storage**: SQLite (后端持久化), localStorage (前端模型缓存)
**Testing**: Vitest (单元测试), Playwright (E2E测试)
**Target Platform**: Web browser (桌面端)
**Project Type**: Full-stack web application (Vue + Express)
**Performance Goals**: 缓存命中时模型列表立即显示，搜索过滤 < 100ms
**Constraints**: 需兼容浏览器 localStorage 限制，需处理 API 失败场景
**Scale/Scope**: 单用户本地部署，模型数量预计 < 100

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| TDD 开发流程 | ✅ | 遵循现有 TDD 流程 |
| 目录结构 | ✅ | 遵循现有 `client/` + `server/` 结构 |
| TypeScript | ✅ | 前端后端均使用 TypeScript |

## Project Structure

### Documentation (this feature)

```text
specs/001-model-switching/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
web-agent/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ModelSelector.vue    # 新增：模型选择器组件
│   │   │   └── ...
│   │   ├── stores/
│   │   │   ├── session.ts          # 修改：增加模型字段
│   │   │   └── settings.ts        # 修改：增加默认模型
│   │   ├── api/
│   │   │   └── rest.ts             # 修改：增加模型列表 API
│   │   └── views/
│   │       └── Chat.vue            # 修改：集成模型选择器
│   └── tests/
│       └── ModelSelector.spec.ts   # 新增：组件测试
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   └── models.ts           # 新增：模型列表 API
│   │   └── services/
│   │       └── database.ts         # 修改：sessions 表增加 model 字段
│   └── tests/
│       └── models.spec.ts          # 新增：API 测试
```

**Structure Decision**: 遵循现有前后端分离结构，新增 `ModelSelector.vue` 组件，复用现有 Pinia stores。

## Phase 0: Research

### Research Tasks

1. **OpenAI 兼容模型列表 API**: 了解 `/v1/models` 端点的标准响应格式
2. **浏览器缓存策略**: localStorage vs sessionStorage 的选择，以及缓存数据结构设计
3. **Vue 3 组件设计模式**: 下拉选择器组件的最佳实践

### Research Findings

**Research 1: OpenAI 模型列表 API**

- **Decision**: 使用 OpenAI 兼容的 `/v1/models` 端点
- **Rationale**: 大多数 LLM API 提供商都遵循 OpenAI 格式
- **Alternatives considered**: 
  - 自定义后端接口 → 增加开发成本
  - 硬编码模型列表 → 无法适应不同 API 提供商

**Research 2: 浏览器缓存策略**

- **Decision**: 使用 localStorage 存储模型列表
- **Rationale**: localStorage 在浏览器关闭后仍保留数据，用户体验更好
- **Alternatives considered**:
  - sessionStorage → 关闭标签页后丢失，用户体验差
  - IndexedDB → 过于复杂，不需要

**Research 3: Vue 3 组件设计**

- **Decision**: 使用 Composition API + TypeScript 构建独立 ModelSelector 组件
- **Rationale**: 与项目现有模式一致，便于维护
- **Alternatives considered**:
  - 第三方 UI 库 → 增加依赖，样式定制成本高

## Phase 1: Design

### Data Model

详见 `data-model.md`

### API Contracts

详见 `contracts/` 目录

### Key Decisions

1. **前端状态管理**: 使用 Pinia store 管理模型缓存状态
2. **缓存数据结构**: `{ models: Model[], cachedAt: string }`
3. **刷新机制**: 每次点击刷新按钮时强制重新请求
4. **默认模型**: 从现有 settings.model 字段语义化为"默认模型"

## Phase 2: Implementation Tasks (to be detailed in tasks.md)

### Frontend Tasks

1. 创建 `ModelSelector.vue` 组件
2. 修改 `session.ts` store 支持会话级模型选择
3. 修改 `rest.ts` 添加模型列表 API 调用
4. 修改 `Chat.vue` 集成模型选择器
5. 添加 Vitest 单元测试

### Backend Tasks

1. 创建 `/api/models` 端点返回可用模型列表
2. 修改 `sessions` 表增加 `model` 字段
3. 修改 `/api/chat/stream` 支持指定模型
4. 添加 Vitest 集成测试

## Complexity Tracking

> No constitution violations to justify.
