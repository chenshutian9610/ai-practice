# Research: 模型切换功能

**Date**: 2026-04-22
**Feature**: 模型切换功能 (001-model-switching)

## Research 1: OpenAI 兼容模型列表 API

### Findings

**OpenAI `/v1/models` 端点格式**

大多数 LLM API 提供商（OpenAI、Anthropic 兼容接口、Ollama 等）都遵循 OpenAI 的 `/v1/models` 端点格式：

```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4",
      "object": "model",
      "created": 1687882411,
      "owned_by": "openai"
    }
  ]
}
```

### Decision

- **Chosen approach**: 使用 `/v1/models` 端点获取模型列表
- **Rationale**: 符合行业标准，大多数 API 提供商兼容
- **Fallback**: 如果 `/v1/models` 不可用，使用 settings 中的 model 字段作为唯一可用模型

---

## Research 2: 浏览器缓存策略

### Findings

| 存储方式 | 容量 | 持久性 | 适用场景 |
|---------|------|--------|----------|
| localStorage | ~5MB | 永久 | 用户偏好、长期缓存 |
| sessionStorage | ~5MB | 会话级 | 临时数据 |
| IndexedDB | ~50MB+ | 永久 | 结构化大数据 |

### Decision

- **Chosen approach**: localStorage
- **Rationale**:
  - 模型列表相对稳定，适合长期缓存
  - 用户切换会话后仍保留缓存，提升体验
  - 容量足够（模型列表通常 < 1KB）
  - 与项目现有的 api_key 存储方式一致

### Cache Structure

```typescript
interface ModelCache {
  models: Array<{ id: string; object: string; created: number; owned_by: string }>;
  cachedAt: string; // ISO timestamp
}
```

### Cache Key

- Key: `web-agent:model-cache`
- 更新策略: 仅在用户点击刷新按钮时更新

---

## Research 3: Vue 3 下拉选择器组件设计

### Findings

**现有项目组件模式**:
- 使用 Composition API (`<script setup lang="ts">`)
- Props 定义使用 TypeScript interface
- 事件使用 `defineEmits`
- 样式使用 scoped CSS

**推荐设计**:
- 组件包含：搜索输入框、刷新按钮、下拉列表
- 使用 `v-model` 进行双向绑定
- 支持键盘导航（↑↓ 选择，Enter 确认）

---

## Research 4: 状态管理架构

### Findings

**现有架构**:
- `settings.ts`: 全局设置（API 配置、主题）
- `session.ts`: 会话管理
- `chat.ts`: 消息管理

### Decision

- **修改 `session.ts`**: 增加会话级模型选择状态
- **新增本地状态**: `ModelSelector.vue` 内部管理模型列表缓存
- **不新增全局 store**: 避免过度工程化

### Session 数据结构变更

```typescript
// 新增字段
interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  model?: string; // 新增：当前会话使用的模型
}
```

---

## Summary

| 决策点 | 最终选择 | 理由 |
|--------|---------|------|
| API 端点 | `/v1/models` | 行业标准，兼容性最佳 |
| 缓存方式 | localStorage | 持久化、容量足够、实现简单 |
| 组件架构 | 独立 ModelSelector 组件 | 与项目模式一致，可复用 |
| 状态管理 | session store 扩展 | 最小改动，满足需求 |
