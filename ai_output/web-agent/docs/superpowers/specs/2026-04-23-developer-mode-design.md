# 开发者模式设计文档

> **日期：** 2026-04-23

## 1. 功能概述

在设置页面添加开发者模式开关。开启后，AI 回复消息旁边显示调试按钮，点击弹出模态框，同时展示：
- **Request**：发送给 AI 接口的请求参数
- **Response**：AI 接口的响应结果
- **Tool Calls**：MCP 工具调用过程

## 2. UI 改动

### 2.1 设置页面 (Settings.vue)
- 添加 "开发者模式" Toggle Switch

### 2.2 消息组件 (MessageItem.vue)
- 新增调试按钮 `🔍`（仅在开发者模式开启且消息有调试数据时显示）
- 点击按钮打开 DebugModal

### 2.3 新增组件 (DebugModal.vue)
- 模态框组件
- 分区块展示 Request / Response / Tool Calls
- 每个 JSON 块支持一键复制

## 3. 数据结构

```typescript
interface DebugInfo {
  messageId: string;
  request: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: Array<{ name: string; description?: string }>;
  };
  response: {
    content: string;
    reasoning?: string;
    toolCalls?: Array<{
      id: string;
      name: string;
      arguments: any;
    }>;
  };
  toolCallLogs: Array<{
    name: string;
    arguments: any;
    result?: string;
    error?: string;
  }>;
}
```

## 4. 实现要点

1. **Store 扩展**：在 `chat.ts` 中添加 `debugInfo` Map
2. **API 改造**：后端返回完整请求参数
3. **条件显示**：调试按钮仅在有调试数据时显示
4. **MCP 工具调用**：记录工具调用日志

## 5. Modal 布局

```
┌─────────────────────────────────────────┐
│ 调试信息                              ✕ │
├─────────────────────────────────────────┤
│ ## Request                    [复制]    │
│ ```json                               │
│ { "model": "...", ... }                │
│ ```                                   │
├─────────────────────────────────────────┤
│ ## Response                   [复制]    │
│ ```json                               │
│ { "content": "...", ... }             │
│ ```                                   │
├─────────────────────────────────────────┤
│ ## Tool Calls                 [复制]    │
│ ```json                               │
│ [ { "name": "...", ... }, ... ]       │
│ ```                                   │
└─────────────────────────────────────────┘
```
