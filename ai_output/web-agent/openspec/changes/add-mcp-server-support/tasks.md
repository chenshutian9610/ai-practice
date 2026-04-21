## 1. Setup & Dependencies

- [ ] 1.1 Add `@modelcontextprotocol/sdk` dependency to server/package.json
- [ ] 1.2 Create MCP client module directory `server/src/mcp/`
- [ ] 1.3 Add MCP configuration types to shared types

## 2. MCP Server Configuration (mcp-server-config)

- [ ] 2.1 Extend settings table schema to include mcpServers JSON field
- [ ] 2.2 Add MCP Servers API endpoints to settings routes
  - [ ] 2.2.1 GET /api/settings/mcp-servers - list servers
  - [ ] 2.2.2 PUT /api/settings/mcp-servers - update servers
  - [ ] 2.2.3 POST /api/settings/mcp-servers/test - test connection
- [ ] 2.3 Implement URL validation (no internal IPs, HTTP/HTTPS only)

## 3. MCP Protocol Client (mcp-protocol-client)

- [ ] 3.1 Implement MCPClient class in `server/src/mcp/client.ts`
  - [ ] 3.1.1 Initialize HTTP connection to MCP Server
  - [ ] 3.1.2 Implement tools/list request/response handling
  - [ ] 3.1.3 Implement tools/call request/response handling
- [ ] 3.2 Implement MCPClientManager class to manage multiple clients
  - [ ] 3.2.1 Load enabled servers from settings
  - [ ] 3.2.2 Handle connection pooling and cleanup
  - [ ] 3.2.3 Implement concurrent tool execution
- [ ] 3.3 Add error handling for MCP protocol errors

## 4. Tool Calling Integration (mcp-tool-calling)

- [ ] 4.1 Modify LLM service to support tool_calls parameter
- [ ] 4.2 Implement tool call loop in chat route
  - [ ] 4.2.1 Extract tool calls from LLM response
  - [ ] 4.2.2 Execute tool calls via MCPClientManager
  - [ ] 4.2.3 Append results to message context
  - [ ] 4.2.4 Re-call LLM with tool results
  - [ ] 4.2.5 Implement max iterations limit (10)
- [ ] 4.3 Extend SSE streaming to emit tool events
  - [ ] 4.3.1 Emit tool_call event when LLM requests tool
  - [ ] 4.3.2 Emit tool_result event on completion
  - [ ] 4.3.3 Emit tool_error event on failure

## 5. Frontend: MCP Server Management UI

- [ ] 5.1 Add MCPServerList component to Settings page
- [ ] 5.2 Add MCPServerForm for add/edit server
- [ ] 5.3 Implement server list state management in settings store
- [ ] 5.4 Add API calls for MCP server CRUD operations
- [ ] 5.5 Implement connection test button with status feedback

## 6. Frontend: Tool Call Display

- [ ] 6.1 Update SSE event handling to process tool events
- [ ] 6.2 Add ToolCallIndicator component to show tool call progress
- [ ] 6.3 Display tool name and status during execution
- [ ] 6.4 Show tool error messages to user

## 7. Testing

- [ ] 7.1 Write unit tests for MCPClient class
- [ ] 7.2 Write unit tests for MCPClientManager
- [ ] 7.3 Write integration tests for tool call loop
- [ ] 7.4 Add Playwright tests for MCP UI functionality
- [ ] 7.5 Test with a sample MCP Server (e.g., filesystem)

## 8. Documentation

- [ ] 8.1 Update SPEC.md with MCP capabilities
- [ ] 8.2 Add MCP Server configuration to README
- [ ] 8.3 Document how to use MCP tools in chat
