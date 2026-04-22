# API Contract: 会话模型

**Date**: 2026-04-22
**Feature**: 模型切换功能

## Overview

本合约定义了会话模型选择的相关接口变更。

---

## POST /api/sessions

创建新会话时，可指定使用的模型。

### Request Body

```json
{
  "title": "新会话",
  "model": "gpt-4"  // 可选，不提供时使用默认模型
}
```

### Response (201)

```json
{
  "id": "sess_abc123",
  "title": "新会话",
  "model": "gpt-4",
  "created_at": "2026-04-22T10:00:00.000Z",
  "updated_at": "2026-04-22T10:00:00.000Z"
}
```

---

## GET /api/sessions/:id

获取会话详情时，返回当前会话使用的模型。

### Response (200)

```json
{
  "id": "sess_abc123",
  "title": "新会话",
  "model": "gpt-4",
  "created_at": "2026-04-22T10:00:00.000Z",
  "updated_at": "2026-04-22T10:00:00.000Z",
  "messages": [...]
}
```

---

## PUT /api/sessions/:id/model

更新会话使用的模型。

### Request Body

```json
{
  "model": "claude-3-sonnet"
}
```

### Response (200)

```json
{
  "id": "sess_abc123",
  "title": "新会话",
  "model": "claude-3-sonnet",
  "created_at": "2026-04-22T10:00:00.000Z",
  "updated_at": "2026-04-22T10:05:00.000Z"
}
```

---

## POST /api/chat/stream

发送消息时，支持指定模型。

### Request Body

```json
{
  "sessionId": "sess_abc123",
  "content": "你好",
  "model": "gpt-4"  // 可选，使用会话的当前模型
}
```

### Response

流式响应（SSE），与现有格式一致。

---

## PUT /api/settings

更新设置时，`model` 字段语义变更为"默认模型"。

### Request Body

```json
{
  "model": "gpt-4"
}
```

### Response (200)

```json
{
  "api_endpoint": "https://api.openai.com/v1",
  "model": "gpt-4",
  "system_prompt": "You are a helpful assistant.",
  "theme": "light"
}
```

---

## Data Types

### Session

| Field | Type | Description |
|-------|------|-------------|
| id | string | 会话唯一标识符 |
| title | string | 会话标题 |
| model | string | 当前会话使用的模型 ID |
| created_at | string | 创建时间 (ISO 8601) |
| updated_at | string | 更新时间 (ISO 8601) |
| messages | Message[] | 消息列表 |

### Message

| Field | Type | Description |
|-------|------|-------------|
| id | string | 消息唯一标识符 |
| role | string | "user" 或 "assistant" |
| content | string | 消息内容 |
| created_at | string | 创建时间 (ISO 8601) |

---

## Behavior Changes

| Scenario | New Behavior |
|----------|--------------|
| 创建会话不指定模型 | 使用 settings 中的 model 作为默认模型 |
| 发送消息不指定模型 | 使用会话当前 model 字段 |
| settings.model 更新 | 仅影响新建会话的默认模型，不影响现有会话 |
