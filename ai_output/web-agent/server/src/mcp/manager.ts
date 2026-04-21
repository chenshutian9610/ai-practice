import { MCPClient } from './client.js';
import { MCPServerConfig, MCPTool } from './types.js';

export class MCPClientManager {
  private clients: Map<string, MCPClient> = new Map();
  private initialized = false;

  async initialize(servers: MCPServerConfig[]): Promise<void> {
    // Disconnect existing clients
    await this.cleanup();

    // Create and connect to enabled servers
    const enabledServers = servers.filter(s => s.enabled);

    for (const server of enabledServers) {
      const client = new MCPClient(server);
      try {
        await client.connect();
        this.clients.set(server.id, client);
        console.log(`Connected to MCP server: ${server.name} (${server.id})`);
      } catch (error) {
        console.error(`Failed to connect to MCP server "${server.name}":`, error);
      }
    }

    this.initialized = true;
  }

  async cleanup(): Promise<void> {
    for (const [id, client] of this.clients) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error(`Error disconnecting client ${id}:`, error);
      }
    }
    this.clients.clear();
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getAllTools(): Array<MCPTool & { serverId: string; serverName: string }> {
    const tools: Array<MCPTool & { serverId: string; serverName: string }> = [];

    for (const [serverId, client] of this.clients) {
      if (client.isConnected()) {
        for (const tool of client.getTools()) {
          tools.push({
            ...tool,
            serverId,
            serverName: client.name,
          });
        }
      }
    }

    return tools;
  }

  getToolByName(name: string): { client: MCPClient; tool: MCPTool } | null {
    for (const [serverId, client] of this.clients) {
      if (client.isConnected()) {
        const tool = client.getTools().find(t => t.name === name);
        if (tool) {
          return { client, tool };
        }
      }
    }
    return null;
  }

  async callTool(toolName: string, arguments_: Record<string, unknown>): Promise<{ result: unknown; serverName: string }> {
    const toolInfo = this.getToolByName(toolName);
    if (!toolInfo) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    const result = await toolInfo.client.callTool(toolName, arguments_);
    return { result, serverName: toolInfo.client.name };
  }

  async callTools(toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>): Promise<Array<{ name: string; result: unknown; error?: string; serverName: string }>> {
    // Execute tool calls concurrently
    const promises = toolCalls.map(async (call) => {
      try {
        const { result, serverName } = await this.callTool(call.name, call.arguments);
        return { name: call.name, result, serverName };
      } catch (error) {
        return {
          name: call.name,
          result: null,
          error: String(error),
          serverName: 'unknown'
        };
      }
    });

    return Promise.all(promises);
  }

  getConnectedServers(): string[] {
    const connected: string[] = [];
    for (const [id, client] of this.clients) {
      if (client.isConnected()) {
        connected.push(client.name);
      }
    }
    return connected;
  }
}

// Singleton instance
let mcpManager: MCPClientManager | null = null;

export function getMCPClientManager(): MCPClientManager {
  if (!mcpManager) {
    mcpManager = new MCPClientManager();
  }
  return mcpManager;
}
