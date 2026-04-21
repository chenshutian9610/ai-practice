import { EventEmitter } from 'events';
import { MCPServerConfig, MCPTool } from './types.js';

interface MCPMessage {
  jsonrpc: string;
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class MCPHTTPClient extends EventEmitter {
  private config: MCPServerConfig;
  private tools: MCPTool[] = [];
  private connected = false;
  private requestId = 0;
  private pendingRequests = new Map<number | string, { resolve: (result: unknown) => void; reject: (error: Error) => void }>();

  constructor(config: MCPServerConfig) {
    super();
    this.config = config;
  }

  get name(): string {
    return this.config.name;
  }

  get id(): string {
    return this.config.id;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    if (!this.config.url) {
      throw new Error('HTTP transport requires URL');
    }

    return new Promise((resolve, reject) => {
      // Send initialize request
      this.sendRequest({
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'web-agent-mcp-client',
            version: '1.0.0',
          },
        },
      }).then(() => {
        console.log(`[MCP ${this.config.name}] Initialized successfully`);
        this.connected = true;

        // Send initialized notification
        this.sendNotification('notifications/initialized', {});

        // Discover tools
        return this.discoverTools();
      }).then(() => {
        resolve();
      }).catch((error) => {
        reject(error);
      });
    });
  }

  private async sendRequest(params: { method: string; params?: Record<string, unknown> }): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const message: MCPMessage = {
        jsonrpc: '2.0',
        id,
        method: params.method,
        params: params.params || {},
      };

      this.pendingRequests.set(id, { resolve, reject });

      fetch(this.config.url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(message),
      }).then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          this.pendingRequests.delete(id);
          reject(new Error(`HTTP error ${res.status}: ${errorText}`));
          return;
        }

        // Check content type - only treat as streaming if explicitly text/event-stream
        const contentType = res.headers.get('content-type') || '';
        const isStreaming = contentType.includes('text/event-stream');

        if (isStreaming && res.body) {
          // Handle streaming/SSE response
          const reader = res.body.getReader();
          if (!reader) {
            this.pendingRequests.delete(id);
            reject(new Error('No response body'));
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          const readStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || !trimmed.startsWith('data:')) continue;

                  const data = trimmed.slice(5).trim();
                  try {
                    const parsed: MCPMessage = JSON.parse(data);
                    this.handleMessage(parsed);
                  } catch {
                    // Skip invalid JSON
                  }
                }
              }

              // Stream ended - check if we got our response
              if (this.pendingRequests.has(id)) {
                const pending = this.pendingRequests.get(id)!;
                this.pendingRequests.delete(id);
                // For streaming, we need to complete the request
                pending.resolve({});
              }
            } catch (err) {
              if (this.pendingRequests.has(id)) {
                this.pendingRequests.delete(id);
                reject(err);
              }
            }
          };

          readStream();
        } else {
          // Handle regular JSON response
          try {
            const data = await res.json();
            this.handleMessage(data);

            // For non-streaming, the response should have been processed
            if (this.pendingRequests.has(id)) {
              // Give it a moment to be resolved by handleMessage
              setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                  const pending = this.pendingRequests.get(id)!;
                  this.pendingRequests.delete(id);
                  pending.resolve({});
                }
              }, 100);
            }
          } catch (err) {
            this.pendingRequests.delete(id);
            reject(err);
          }
        }
      }).catch((err) => {
        this.pendingRequests.delete(id);
        reject(err);
      });
    });
  }

  private handleMessage(message: MCPMessage): void {
    // Handle response to our request
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(`MCP error: ${message.error.message}`));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    // Handle notification (no id)
    if (!message.id && message.method) {
      this.emit('notification', message);
    }
  }

  private sendNotification(method: string, params: Record<string, unknown>): void {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };

    fetch(this.config.url!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify(message),
    }).catch((err) => {
      console.warn(`[MCP ${this.config.name}] Failed to send notification:`, err);
    });
  }

  private async discoverTools(): Promise<void> {
    try {
      const response: any = await this.sendRequest({ method: 'tools/list' });

      // Handle JSON-RPC response format (result.tools)
      const tools = response?.tools || response?.result?.tools || [];
      if (tools.length > 0) {
        this.tools = tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema || { type: 'object', properties: {} },
        }));
        console.log(`[MCP ${this.config.name}] Discovered ${this.tools.length} tools`);
      }
    } catch (error) {
      console.warn(`[MCP ${this.config.name}] Failed to discover tools:`, error);
      this.tools = [];
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.tools = [];
    this.pendingRequests.clear();
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  async callTool(toolName: string, arguments_: Record<string, unknown>): Promise<unknown> {
    if (!this.connected) {
      throw new Error(`MCP client "${this.config.name}" is not connected`);
    }

    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found on server "${this.config.name}"`);
    }

    try {
      const response: any = await this.sendRequest({
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: arguments_,
        },
      });

      // Handle different response formats
      const result = response?.result || response;
      if (result && result.content && Array.isArray(result.content)) {
        return result.content.map((c: any) => c.text || JSON.stringify(c)).join('\n');
      }

      return result;
    } catch (error) {
      throw new Error(`Tool call failed for "${toolName}": ${error}`);
    }
  }
}
