## 1. Setup & Dependencies

- [x] 1.1 Add `@modelcontextprotocol/sdk` dependency to server/package.json
- [x] 1.2 Create MCP client module directory `server/src/mcp/`
- [x] 1.3 Add MCP configuration types to shared types

## 2. MCP Server Configuration (mcp-server-config)

- [x] 2.1 Extend settings table schema to include mcpServers JSON field
- [x] 2.2 Add MCP Servers API endpoints to settings routes
  - [x] 2.2.1 GET /api/settings/mcp-servers - list servers
  - [x] 2.2.2 PUT /api/settings/mcp-servers - update servers
  - [x] 2.2.3 POST /api/settings/mcp-servers/test - test connection
- [x] 2.3 Implement URL validation (no internal IPs, HTTP/HTTPS only)

## 3. MCP Protocol Client (mcp-protocol-client)

- [x] 3.1 Implement MCPClient class in `server/src/mcp/client.ts`
  - [x] 3.1.1 Initialize HTTP connection to MCP Server
  - [x] 3.1.2 Implement tools/list request/response handling
  - [x] 3.1.3 Implement tools/call request/response handling
- [x] 3.2 Implement MCPClientManager class to manage multiple clients
  - [x] 3.2.1 Load enabled servers from settings
  - [x] 3.2.2 Handle connection pooling and cleanup
  - [x] 3.2.3 Implement concurrent tool execution
- [x] 3.3 Add error handling for MCP protocol errors

## 4. Tool Calling Integration (mcp-tool-calling)

- [x] 4.1 Modify LLM service to support tool_calls parameter
- [x] 4.2 Implement tool call loop in chat route
  - [x] 4.2.1 Extract tool calls from LLM response
  - [x] 4.2.2 Execute tool calls via MCPClientManager
  - [x] 4.2.3 Append results to message context
  - [x] 4.2.4 Re-call LLM with tool results
  - [x] 4.2.5 Implement max iterations limit (10)
- [x] 4.3 Extend SSE streaming to emit tool events
  - [x] 4.3.1 Emit tool_call event when LLM requests tool
  - [x] 4.3.2 Emit tool_result event on completion
  - [x] 4.3.3 Emit tool_error event on failure

## 5. Frontend: MCP Server Management UI

- [x] 5.1 Add MCPServerList component to Settings page
- [x] 5.2 Add MCPServerForm for add/edit server
- [x] 5.3 Implement server list state management in settings store
- [x] 5.4 Add API calls for MCP server CRUD operations
- [x] 5.5 Implement connection test button with status feedback

## 6. Frontend: Tool Call Display

- [x] 6.1 Update SSE event handling to process tool events
- [x] 6.2 Add ToolCallIndicator component to show tool call progress
- [x] 6.3 Display tool name and status during execution
- [x] 6.4 Show tool error messages to user

## 7. Testing

- [ ] 7.1 Write unit tests for MCPClient class
- [ ] 7.2 Write unit tests for MCPClientManager
- [ ] 7.3 Write integration tests for tool call loop
- [ ] 7.4 Add Playwright tests for MCP UI functionality
- [x] 7.5 Test with a sample MCP Server (e.g., filesystem) - **Verified with Python MCP time server**

## 8. Documentation

- [x] 8.1 Update SPEC.md with MCP capabilities
- [x] 8.2 Add MCP Server configuration to README
- [ ] 8.3 Document how to use MCP tools in chat
