# Data Model: 模型切换功能

**Date**: 2026-04-22
**Feature**: 模型切换功能 (001-model-switching)

## Overview

本功能涉及的数据变更包括：
1. 前端模型缓存（localStorage）
2. 后端 sessions 表增加 model 字段
3. 现有 settings 表语义调整

---

## Frontend

### ModelCache (localStorage)

存储在浏览器 localStorage 中，用于缓存模型列表。

```typescript
interface ModelCache {
  models: Model[];
  cachedAt: string; // ISO timestamp
}

interface Model {
  id: string;       // 模型 ID，如 "gpt-4", "claude-3-sonnet"
  object: string;   // 固定为 "model"
  created: number;  // 创建时间戳
  owned_by: string; // 模型所有者
}
```

**Storage Key**: `web-agent:model-cache`

### Session (Frontend Type)

```typescript
interface Session {
  id: string;
  title: string;
  model: string;      // 当前会话使用的模型 ID
  created_at: string;
  updated_at: string;
}
```

---

## Backend

### Sessions Table (SQLite)

修改现有 sessions 表，增加 model 字段：

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-3.5-turbo',  -- 新增：当前会话使用的模型
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Settings Table (SQLite)

现有 settings 表的 `model` 字段语义调整为"默认模型"：

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  api_endpoint TEXT DEFAULT '',
  api_key TEXT DEFAULT '',
  model TEXT DEFAULT 'gpt-3.5-turbo',  -- 语义变更：默认模型
  system_prompt TEXT DEFAULT '',
  theme TEXT DEFAULT 'light',
  mcp_servers TEXT DEFAULT '[]'
);
```

---

## Entity Relationships

```
┌─────────────┐     1:N      ┌─────────────┐
│  Settings   │──────────────│   Session   │
│             │              │             │
│ - model     │              │ - model     │
│   (默认模型) │              │   (会话模型) │
└─────────────┘              └─────────────┘
                                  │
                                  │ uses
                                  ▼
                           ┌─────────────┐
                           │   Models    │
                           │  (API 获取) │
                           │             │
                           │ - id        │
                           │ - created   │
                           │ - owned_by  │
                           └─────────────┘
                                  │
                           (缓存于 localStorage)
```

---

## Validation Rules

| 字段 | 规则 |
|------|------|
| session.model | 必须是在 models 列表中存在的 ID，或为空（回退到默认模型）|
| settings.model | 必须是非空字符串，作为新会话的默认值 |
| ModelCache.models | 必须是非空数组，如果 API 返回空则保留旧缓存 |

---

## State Transitions

### 模型选择状态流

```
┌──────────────┐     点击选择器      ┌──────────────┐
│   Idle       │──────────────────▶│   Loading    │
│              │   (首次或刷新)     │              │
└──────────────┘                    └──────────────┘
       ▲                                  │
       │                                  │ 成功
       │                                  ▼
       │                           ┌──────────────┐
       │      显示缓存             │   Loaded     │
       └──────────────────────────│              │
                                 └──────────────┘
```

### 会话模型状态流

```
┌──────────────┐   创建会话        ┌──────────────┐
│   -         │──────────────────▶│  Default     │
│              │   使用默认模型     │   Model      │
└──────────────┘                   └──────────────┘
                                           │
                                           │ 用户切换
                                           ▼
                                    ┌──────────────┐
                                    │  Custom      │
                                    │   Model      │
                                    └──────────────┘
```
