import { spawn, ChildProcess } from 'child_process';
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

export class MCPClient extends EventEmitter {
  private config: MCPServerConfig;
  private process: ChildProcess | null = null;
  private tools: MCPTool[] = [];
  private connected = false;
  private requestId = 0;
  private pendingRequests = new Map<number | string, { resolve: (result: unknown) => void; reject: (error: Error) => void }>();
  private messageBuffer = '';

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

    const { command, args } = this.config;
    if (!command || !args || args.length === 0) {
      throw new Error('Stdio transport requires command and args');
    }

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
        });

        if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
          throw new Error('Failed to create stdio streams');
        }

        this.process.stdout?.on('data', (data: Buffer) => {
          this.handleData(data.toString());
        });

        this.process.stderr?.on('data', (data: Buffer) => {
          console.error(`[MCP ${this.config.name}] stderr:`, data.toString());
        });

        this.process.on('error', (error) => {
          console.error(`[MCP ${this.config.name}] Process error:`, error);
          this.connected = false;
          this.emit('error', error);
        });

        this.process.on('exit', (code, signal) => {
          console.log(`[MCP ${this.config.name}] Process exited with code ${code}, signal ${signal}`);
          this.connected = false;
          this.emit('close', code, signal);
        });

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
        }).then((result: any) => {
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

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleData(data: string): void {
    this.messageBuffer += data;

    // Split by newline and process complete messages
    const lines = this.messageBuffer.split('\n');
    this.messageBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const message: MCPMessage = JSON.parse(trimmed);
        this.handleMessage(message);
      } catch (error) {
        console.warn(`[MCP ${this.config.name}] Failed to parse message:`, trimmed);
      }
    }
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

  private sendRequest(params: { method: string; params?: Record<string, unknown> }): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('Process not initialized'));
        return;
      }

      const id = ++this.requestId;
      const message: MCPMessage = {
        jsonrpc: '2.0',
        id,
        method: params.method,
        params: params.params || {},
      };

      this.pendingRequests.set(id, { resolve, reject });
      this.process!.stdin!.write(JSON.stringify(message) + '\n');
    });
  }

  private sendNotification(method: string, params: Record<string, unknown>): void {
    if (!this.process?.stdin) return;

    const message: MCPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };

    this.process.stdin.write(JSON.stringify(message) + '\n');
  }

  private async discoverTools(): Promise<void> {
    try {
      const response: any = await this.sendRequest({ method: 'tools/list' });

      if (response && response.tools) {
        this.tools = response.tools.map((tool: any) => ({
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
    if (this.process) {
      this.process.stdin?.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'shutdown',
        params: {},
      }) + '\n');

      setTimeout(() => {
        if (this.process) {
          this.process.kill();
          this.process = null;
        }
      }, 1000);
    }

    this.connected = false;
    this.tools = [];
    this.pendingRequests.clear();
    this.messageBuffer = '';
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
      if (response && response.content && Array.isArray(response.content)) {
        return response.content.map((c: any) => c.text || JSON.stringify(c)).join('\n');
      }

      return response;
    } catch (error) {
      throw new Error(`Tool call failed for "${toolName}": ${error}`);
    }
  }
}
