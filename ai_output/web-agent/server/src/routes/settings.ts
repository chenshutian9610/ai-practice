import { Router } from 'express';
import * as models from '../services/models.js';
import { v4 as uuidv4 } from 'uuid';
import { MCPServerConfig } from '../mcp/types.js';
import { validateMCPServerConfig, validateMCPServerURL } from '../mcp/validation.js';

const router = Router();

// 获取设置
router.get('/', (req, res) => {
  try {
    const settings = models.getSettings();
    // 不返回 api_key
    res.json({
      api_endpoint: settings.api_endpoint,
      model: settings.model,
      system_prompt: settings.system_prompt,
      theme: settings.theme,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 更新设置
router.put('/', (req, res) => {
  try {
    const { api_endpoint, api_key, model, system_prompt, theme } = req.body;

    const updates: Partial<models.Settings> = {};

    if (api_endpoint !== undefined) updates.api_endpoint = api_endpoint;
    if (api_key !== undefined) updates.api_key = api_key;
    if (model !== undefined) updates.model = model;
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;
    if (theme !== undefined) updates.theme = theme;

    const settings = models.updateSettings(updates);

    res.json({
      api_endpoint: settings.api_endpoint,
      model: settings.model,
      system_prompt: settings.system_prompt,
      theme: settings.theme,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============ MCP Server 管理 ============

// 获取 MCP Servers
router.get('/mcp-servers', (req, res) => {
  try {
    const settings = models.getSettings();
    res.json(settings.mcpServers);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 更新 MCP Servers
router.put('/mcp-servers', (req, res) => {
  try {
    const { servers } = req.body;

    if (!Array.isArray(servers)) {
      return res.status(400).json({ error: 'servers must be an array' });
    }

    // Validate all servers
    for (const server of servers) {
      const validation = validateMCPServerConfig(server);
      if (!validation.valid) {
        return res.status(400).json({ error: `Invalid server "${server.name}": ${validation.error}` });
      }
    }

    const settings = models.updateSettings({ mcpServers: servers });
    res.json(settings.mcpServers);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 添加单个 MCP Server
router.post('/mcp-servers', (req, res) => {
  try {
    const { name, url, command, args, enabled = true, headers = {} } = req.body;

    const config: Partial<MCPServerConfig> = {
      name: name?.trim(),
      enabled,
      headers,
    };

    if (url) config.url = url.trim();
    if (command) config.command = command.trim();
    if (args) config.args = Array.isArray(args) ? args : args.split(' ').filter(s => s.trim());

    const validation = validateMCPServerConfig(config);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const newServer: MCPServerConfig = {
      id: uuidv4(),
      name: name.trim(),
      enabled,
      headers,
    };

    if (url) newServer.url = url.trim();
    if (command) {
      newServer.command = command.trim();
      newServer.args = Array.isArray(args) ? args : args.split(' ').filter((s: string) => s.trim());
    }

    const settings = models.getSettings();
    const updatedServers = [...settings.mcpServers, newServer];
    models.updateSettings({ mcpServers: updatedServers });

    res.json(newServer);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 更新单个 MCP Server
router.put('/mcp-servers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, command, args, enabled, headers } = req.body;

    const settings = models.getSettings();
    const serverIndex = settings.mcpServers.findIndex(s => s.id === id);

    if (serverIndex === -1) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const existingServer = settings.mcpServers[serverIndex];
    const updatedServer = {
      ...existingServer,
      name: name !== undefined ? name.trim() : existingServer.name,
      url: url !== undefined ? (url ? url.trim() : undefined) : existingServer.url,
      command: command !== undefined ? (command ? command.trim() : undefined) : existingServer.command,
      args: args !== undefined ? (Array.isArray(args) ? args : args.split(' ').filter((s: string) => s.trim())) : existingServer.args,
      enabled: enabled !== undefined ? enabled : existingServer.enabled,
      headers: headers !== undefined ? headers : existingServer.headers,
    };

    // Remove undefined fields
    if (!updatedServer.url) delete updatedServer.url;
    if (!updatedServer.command) delete updatedServer.command;
    if (!updatedServer.args) delete updatedServer.args;

    const validation = validateMCPServerConfig(updatedServer);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const updatedServers = [...settings.mcpServers];
    updatedServers[serverIndex] = updatedServer;
    models.updateSettings({ mcpServers: updatedServers });

    res.json(updatedServer);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 删除 MCP Server
router.delete('/mcp-servers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const settings = models.getSettings();

    const serverExists = settings.mcpServers.some(s => s.id === id);
    if (!serverExists) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const updatedServers = settings.mcpServers.filter(s => s.id !== id);
    models.updateSettings({ mcpServers: updatedServers });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 测试 MCP Server 连接
router.post('/mcp-servers/test', async (req, res) => {
  try {
    const { url, headers = {} } = req.body;

    const validation = validateMCPServerURL(url);
    if (!validation.valid) {
      return res.json({ success: false, error: validation.error });
    }

    // Try to connect to the MCP server
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${url}/tools/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        res.json({ success: true, message: 'Connection successful' });
      } else {
        const errorText = await response.text();
        res.json({ success: false, error: `Server returned ${response.status}: ${errorText}` });
      }
    } catch (fetchError) {
      clearTimeout(timeout);
      const error = fetchError as Error;
      if (error.name === 'AbortError') {
        res.json({ success: false, error: 'Connection timeout (5s)' });
      } else {
        res.json({ success: false, error: `Connection failed: ${error.message}` });
      }
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;