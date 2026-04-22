# API Contract: 模型列表

**Date**: 2026-04-22
**Feature**: 模型切换功能

## Overview

本合约定义了前端获取模型列表的 API 接口。

---

## GET /api/models

获取当前配置的 API 端点支持的模型列表。

### Request

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| x-api-key | Yes | API Key，用于认证 |

### Response

**Success (200)**

```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4",
      "object": "model",
      "created": 1687882411,
      "owned_by": "openai"
    },
    {
      "id": "gpt-3.5-turbo",
      "object": "model",
      "created": 1677610602,
      "owned_by": "openai"
    }
  ]
}
```

**Error Responses**

| Status | Body | Description |
|--------|------|-------------|
| 400 | `{ "error": "API endpoint not configured" }` | 未配置 API 端点 |
| 401 | `{ "error": "Invalid API key" }` | API Key 无效 |
| 500 | `{ "error": "Failed to fetch models" }` | 获取模型列表失败 |
| 503 | `{ "error": "API endpoint unreachable" }` | API 端点不可达 |

---

## Data Types

### Model

| Field | Type | Description |
|-------|------|-------------|
| id | string | 模型唯一标识符 |
| object | string | 固定值 "model" |
| created | number | 模型创建时间戳 |
| owned_by | string | 模型所有者 |

---

## Usage Examples

### cURL

```bash
curl -X GET http://localhost:4000/api/models \
  -H "x-api-key: sk-xxx"
```

### JavaScript (fetch)

```javascript
const response = await fetch('/api/models', {
  headers: {
    'x-api-key': localStorage.getItem('api_key')
  }
});
const data = await response.json();
```

---

## Error Handling

| Scenario | Frontend Behavior |
|----------|-------------------|
| API endpoint 未配置 | 显示 "请先配置 API 端点" |
| API Key 无效 | 显示 "API Key 无效，请检查设置" |
| 网络错误 | 显示 "网络错误，使用缓存数据" |
| 返回空列表 | 保留旧缓存，显示警告 "未获取到新模型" |
