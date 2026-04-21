## Context

Web Agent 目前仅支持通过 OpenAI 兼容 API 调用 LLM，无法访问外部工具和服务。用户需要扩展 Agent 能力，支持 MCP (Model Context Protocol) 服务器连接，从而实现网页搜索、文件操作、API 调用等工具调用功能。

MCP 是一种标准化协议，允许 AI 模型与外部工具和服务交互。当前已有多个开源 MCP Server 实现（如 filesystem、http、search 等）。

## Goals / Non-Goals

**Goals:**
- 支持配置多个 MCP Server 连接
- 实现 MCP JSON-RPC 协议客户端
- 在聊天流程中支持 LLM 请求工具调用
- 提供 MCP Server 管理界面

**Non-Goals:**
- 不实现 MCP Server（仅作为客户端）
- 不支持 MCP Resource 模板（仅支持 Tool 调用）
- 不实现复杂的工具编排/工作流
- 不修改现有的 REST/GraphQL API 协议

## Decisions

### 1. MCP 协议实现方式

**决定**: 使用 `@modelcontextprotocol/sdk` 官方 SDK

**理由**:
- 官方 SDK 已实现 MCP 协议核心逻辑（连接、会话、消息编解码）
- 减少重复造轮子，降低维护成本
- 协议如有变更，SDK 会同步更新

**替代方案**:
- 手动实现 MCP JSON-RPC 协议 → 工作量大，不推荐
- 使用第三方 MCP 客户端库 → 维护风险高

### 2. 工具调用循环处理

**决定**: 后端处理工具调用循环，前端展示状态

**理由**:
- 工具调用可能涉及多次 LLM 请求，后端循环更可控
- 流式响应时，前端需要显示工具调用步骤
- 避免前端处理复杂的异步调用逻辑

**实现方式**:
1. LLM 返回 tool_calls 时，后端执行工具调用
2. 将工具结果作为消息追加到上下文
3. 再次调用 LLM 处理结果
4. 直到 LLM 不再请求工具调用

### 3. MCP Server 配置存储

**决定**: 存储在 SQLite 的 settings 表中（JSON 格式）

**理由**:
- 复用现有存储机制，无需新增表
- 配置可随会话持久化
- 简单直接

**数据结构**:
```json
{
  "mcpServers": [
    {
      "id": "uuid",
      "name": "Filesystem",
      "url": "http://localhost:3000",
      "enabled": true,
      "headers": {}
    }
  ]
}
```

### 4. 传输协议

**决定**: 使用 HTTP + SSE（复用现有流式响应机制）

**理由**:
- 复用现有的 `/api/chat` 流式响应端点
- MCP Server 之间使用 HTTP 通信
- 避免引入 WebSocket 复杂度

**消息格式扩展**:
```typescript
// SSE 事件类型
{ "type": "text", "content": "..." }           // 文本输出
{ "type": "tool_call", "tool": "search", "input": {...} }  // 工具调用开始
{ "type": "tool_result", "tool": "search", "result": {...} }  // 工具调用结果
{ "type": "tool_error", "tool": "search", "error": "..." }    // 工具调用错误
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| MCP Server 不可用 | 前端显示连接错误，后端设置超时（5s） |
| 工具调用循环导致响应慢 | 设置最大调用次数限制（10次），超限返回错误 |
| 工具调用阻塞流式响应 | 使用异步并发调用多个工具 |
| 安全风险（SSRF） | MCP Server URL 仅允许 http/https，禁止内网地址 |
| LLM 返回无效工具调用 | 捕获错误，告知 LLM 工具不可用 |

## Migration Plan

1. **开发阶段**:
   - 新增 MCP 配置表/字段
   - 实现 MCP SDK 集成
   - 实现工具调用循环
   - 前端新增 MCP 管理 UI

2. **测试阶段**:
   - 单元测试覆盖 MCP 客户端
   - 集成测试验证工具调用流程
   - 使用官方 MCP Server 进行 E2E 测试

3. **上线阶段**:
   - 向后兼容：MCP 功能默认关闭
   - 用户需手动启用 MCP Server

## Open Questions

- [ ] MCP SDK 与现有 TypeScript 项目的兼容性验证
- [ ] 是否需要支持 MCP Server 的认证机制（API Key、Bearer Token）
- [ ] 工具调用结果的缓存策略
