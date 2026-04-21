import { MCPClient as StdioClient } from './client-stdio.js';
import { MCPHTTPClient } from './client-http.js';
import { MCPServerConfig, MCPTool } from './types.js';

export class MCPClient {
  private stdioClient: StdioClient | null = null;
  private httpClient: MCPHTTPClient | null = null;
  private config: MCPServerConfig;
  private tools: MCPTool[] = [];
  private connected = false;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  get name(): string {
    return this.stdioClient?.name || this.httpClient?.name || this.config.name;
  }

  get id(): string {
    return this.config.id;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      // Choose transport based on config
      if (this.config.command && this.config.args && this.config.args.length > 0) {
        // Stdio transport
        console.log(`Connecting to MCP server "${this.config.name}" via stdio: ${this.config.command} ${this.config.args.join(' ')}`);
        this.stdioClient = new StdioClient(this.config);
        await this.stdioClient.connect();
      } else if (this.config.url) {
        // HTTP transport
        console.log(`Connecting to MCP server "${this.config.name}" via HTTP: ${this.config.url}`);
        this.httpClient = new MCPHTTPClient(this.config);
        await this.httpClient.connect();
      } else {
        throw new Error('MCP server must have either url or command/args configured');
      }

      this.connected = true;
      this.tools = this.stdioClient?.getTools() || this.httpClient?.getTools() || [];
      console.log(`MCP server "${this.config.name}" connected with ${this.tools.length} tools`);
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to MCP server "${this.config.name}": ${error}`);
    }
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  async disconnect(): Promise<void> {
    if (this.stdioClient) {
      await this.stdioClient.disconnect();
      this.stdioClient = null;
    }
    if (this.httpClient) {
      await this.httpClient.disconnect();
      this.httpClient = null;
    }
    this.connected = false;
    this.tools = [];
  }

  async callTool(toolName: string, arguments_: Record<string, unknown>): Promise<unknown> {
    if (!this.connected) {
      throw new Error(`MCP client "${this.config.name}" is not connected`);
    }

    if (this.stdioClient) {
      return this.stdioClient.callTool(toolName, arguments_);
    }
    if (this.httpClient) {
      return this.httpClient.callTool(toolName, arguments_);
    }

    throw new Error('No transport available');
  }
}
