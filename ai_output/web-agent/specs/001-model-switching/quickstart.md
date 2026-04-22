# Quickstart: 模型切换功能

**Date**: 2026-04-22
**Feature**: 模型切换功能 (001-model-switching)

## Overview

本文档为开发者提供快速上手指南，帮助理解模型切换功能的实现要点。

---

## 实现概览

### 核心变更

1. **新增组件**: `ModelSelector.vue` - 模型选择器
2. **API 端点**: `GET /api/models` - 获取可用模型列表
3. **数据库变更**: sessions 表增加 `model` 字段
4. **前端缓存**: localStorage 存储模型列表

### 文件变更清单

```
client/src/
├── components/
│   └── ModelSelector.vue          # 新增
├── stores/
│   ├── session.ts                 # 修改：增加 model 字段
│   └── settings.ts                # 修改：语义化为默认模型
├── api/
│   └── rest.ts                   # 修改：增加 models API
└── views/
    └── Chat.vue                   # 修改：集成选择器

server/src/
├── routes/
│   └── models.ts                  # 新增
├── services/
│   └── database.ts               # 修改：sessions 表
└── index.ts                      # 修改：注册新路由
```

---

## 开发顺序

### 1. 后端开发 (先)

```bash
# 1.1 创建 /api/models 路由
# 1.2 修改 database.ts 添加 model 字段
# 1.3 修改 /api/chat/stream 支持指定模型
```

### 2. 前端开发 (后)

```bash
# 2.1 修改 rest.ts 添加 models API 调用
# 2.2 创建 ModelSelector.vue 组件
# 2.3 修改 session.ts store
# 2.4 集成到 Chat.vue
```

---

## API 调用流程

### 模型列表获取

```
前端                              后端                              LLM API
  │                                │                                 │
  │ GET /api/models                │                                 │
  │───────────────────────────────▶│                                 │
  │                                │ GET /v1/models                  │
  │                                │───────────────────────────────▶  │
  │                                │                                 │
  │                                │  { "data": [...] }              │
  │                                │◀───────────────────────────────│
  │  { "data": [...] }             │                                 │
  │◀──────────────────────────────│                                 │
  │                                │                                 │
  ▼                                ▼                                 ▼
```

### 模型选择与消息发送

```
前端                              后端                              LLM API
  │                                │                                 │
  │ 1. 用户选择模型 "gpt-4"        │                                 │
  │    ↓                           │                                 │
  │ 2. PUT /api/sessions/:id/model│                                 │
  │    POST /api/chat/stream       │                                 │
  │    (model: "gpt-4")            │                                 │
  │───────────────────────────────▶│                                 │
  │                                │                                 │
  │                                │ 3. POST /v1/chat/completions    │
  │                                │    (model: "gpt-4")             │
  │                                │─────────────────────────────────▶│
  │                                │                                 │
  │                                │  Stream response                │
  │                                │◀─────────────────────────────────│
  │                                │                                 │
  │  SSE stream                    │                                 │
  │◀──────────────────────────────│                                 │
  │                                │                                 │
  ▼                                ▼                                 ▼
```

---

## 缓存策略

### localStorage 数据结构

```javascript
// Key: "web-agent:model-cache"
{
  models: [
    { id: "gpt-4", object: "model", created: 1687882411, owned_by: "openai" },
    { id: "gpt-3.5-turbo", object: "model", created: 1677610602, owned_by: "openai" }
  ],
  cachedAt: "2026-04-22T10:00:00.000Z"
}
```

### 缓存生命周期

| 事件 | 行为 |
|------|------|
| 首次打开选择器 | 从 API 获取并缓存 |
| 后续打开选择器 | 直接使用缓存 |
| 点击刷新按钮 | 强制重新获取并更新缓存 |
| API 请求失败 | 使用旧缓存，显示错误提示 |

---

## 测试要点

### 后端测试

- [ ] `GET /api/models` 返回正确的模型列表格式
- [ ] 未配置 API 时返回 400 错误
- [ ] API Key 无效时返回 401 错误
- [ ] sessions 表 model 字段正确保存

### 前端测试

- [ ] 首次加载显示加载状态
- [ ] 缓存命中时立即显示列表
- [ ] 搜索框能正确过滤
- [ ] 刷新按钮重新获取数据
- [ ] 新会话使用默认模型
- [ ] 切换模型后发送消息使用新模型

---

## 常见问题

### Q: 如何处理 API 返回空列表？

A: 保留旧缓存，显示警告 "未获取到新模型"。这防止用户因临时网络问题丢失可用模型列表。

### Q: 缓存需要过期时间吗？

A: 不需要。用户可以通过刷新按钮手动更新。自动过期可能造成不必要的重复请求。

### Q: 如何处理模型被 API 提供商移除的情况？

A: 用户切换到该模型时会失败，需要用户手动选择其他模型。可以在选择时显示警告。
