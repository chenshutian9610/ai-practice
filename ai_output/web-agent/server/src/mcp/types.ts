export interface MCPServerConfig {
  id: string;
  name: string;
  // HTTP transport
  url?: string;
  headers?: Record<string, string>;
  // Stdio transport
  command?: string;
  args?: string[];
  // Common
  enabled: boolean;
}

export interface MCPSettings {
  mcpServers: MCPServerConfig[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  callId: string;
  toolName: string;
  result: unknown;
  error?: string;
}

export interface SSEEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'tool_error';
  content?: string;
  reasoning?: string;
  messageId?: string;
  tool?: string;
  toolCallId?: string;
  input?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}
