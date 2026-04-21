## Why

当前 Web Agent 仅支持通过 REST API 调用 LLM，无法访问外部工具和服务。引入 MCP (Model Context Protocol) 支持后，Agent 可以动态调用 MCP Server 提供的工具，实现网页搜索、文件操作、API 调用等能力，大幅扩展 Agent 的实用性。

## What Changes

- 新增 MCP Server 配置管理（添加/编辑/删除 MCP Server 连接）
- 实现 MCP 协议客户端，支持与 MCP Server 建立连接
- 在聊天流程中，支持 LLM 请求 MCP 工具调用
- 前端界面增加 MCP Server 管理界面
- 支持 SSE 传输模式下传递 MCP 工具调用请求和响应

## Capabilities

### New Capabilities

- `mcp-server-config`: MCP Server 连接配置管理
  - 支持配置 MCP Server URL、认证信息
  - 支持测试连接是否可用
  - 支持启用/禁用特定 Server
- `mcp-protocol-client`: MCP 协议客户端实现
  - 实现 MCP JSON-RPC 通信协议
  - 支持发现 Server 提供的工具列表
  - 支持调用工具并获取结果
- `mcp-tool-calling`: MCP 工具调用集成
  - 在 LLM 请求流程中注入可用工具列表
  - 处理工具调用循环（LLM 请求 -> 工具调用 -> 结果 -> LLM）
  - 支持并发工具调用

### Modified Capabilities

- `chat-flow`: 聊天流程需要支持工具调用模式
  - 修改消息处理逻辑，支持识别和执行工具调用
  - 在流式响应中展示工具调用状态和结果

## Impact

- **后端**: 新增 MCP 协议客户端模块，修改 chat 路由以支持工具调用
- **前端**: 新增 MCP Server 管理 UI（Settings 页面），修改聊天组件显示工具调用状态
- **依赖**: 可能需要引入 `@modelcontextprotocol/sdk` 或类似 MCP 客户端库
- **API**: 扩展 `/api/settings` 端点以支持 MCP Server 配置
