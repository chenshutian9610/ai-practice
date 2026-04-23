const API_BASE = '/api';

export async function getSessions() {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function createSession(title: string, model?: string) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, model }),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function getSession(id: string) {
  const res = await fetch(`${API_BASE}/sessions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export async function deleteSession(id: string) {
  const res = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete session');
}

export async function updateSessionModel(id: string, model: string) {
  const res = await fetch(`${API_BASE}/sessions/${id}/model`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
  if (!res.ok) throw new Error('Failed to update session model');
  return res.json();
}

export async function sendMessage(sessionId: string, content: string) {
  const apiKey = localStorage.getItem('api_key') || '';
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {})
    },
    body: JSON.stringify({ sessionId, content }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export interface ToolCallEvent {
  type: 'tool_call' | 'tool_result' | 'tool_error' | 'debug_info';
  tool?: string;
  toolCallId?: string;
  input?: Record<string, unknown>;
  result?: string;
  error?: string;
  request?: {
    endpoint?: string;
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: any[];
  };
}

export async function sendMessageStream(
  sessionId: string,
  content: string,
  onChunk: (chunk: string, reasoning: string) => void,
  onToolEvent?: (event: ToolCallEvent) => void,
  signal?: AbortSignal
) {
  const apiKey = localStorage.getItem('api_key') || '';
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {})
    },
    body: JSON.stringify({ sessionId, content }),
    signal,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to send message');
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

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
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);

        // Check for tool events
        if (parsed.type === 'tool_call' || parsed.type === 'tool_result' || parsed.type === 'tool_error') {
          if (onToolEvent) {
            onToolEvent({
              type: parsed.type,
              tool: parsed.tool,
              toolCallId: parsed.toolCallId,
              input: parsed.input,
              result: parsed.result,
              error: parsed.error,
            });
          }
          continue;
        }

        // Debug info
        if (parsed.type === 'debug_info') {
          if (onToolEvent) {
            onToolEvent({
              type: 'debug_info',
              request: parsed.request,
            });
          }
          continue;
        }

        // Regular text content
        if (parsed.content || parsed.reasoning) {
          onChunk(parsed.content || '', parsed.reasoning || '');
        }
      } catch {
        // Skip invalid lines
      }
    }
  }
}

export async function getSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: any) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function getMCPServers() {
  const res = await fetch(`${API_BASE}/settings/mcp-servers`);
  if (!res.ok) throw new Error('Failed to fetch MCP servers');
  return res.json();
}

export async function updateMCPServers(servers: any[]) {
  const res = await fetch(`${API_BASE}/settings/mcp-servers`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ servers }),
  });
  if (!res.ok) throw new Error('Failed to update MCP servers');
  return res.json();
}

export async function addMCPServer(server: { name: string; url: string; enabled?: boolean; headers?: Record<string, string> }) {
  const res = await fetch(`${API_BASE}/settings/mcp-servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(server),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to add MCP server');
  }
  return res.json();
}

export async function updateMCPServer(id: string, updates: { name?: string; url?: string; enabled?: boolean; headers?: Record<string, string> }) {
  const res = await fetch(`${API_BASE}/settings/mcp-servers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update MCP server');
  }
  return res.json();
}

export async function deleteMCPServer(id: string) {
  const res = await fetch(`${API_BASE}/settings/mcp-servers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete MCP server');
  return res.json();
}

export async function testMCPServer(url: string, headers?: Record<string, string>) {
  const res = await fetch(`${API_BASE}/settings/mcp-servers/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, headers }),
  });
  if (!res.ok) throw new Error('Failed to test MCP server');
  return res.json();
}

export async function exportSession(id: string) {
  const res = await fetch(`${API_BASE}/sessions/${id}/export`);
  if (!res.ok) throw new Error('Failed to export session');
  return res.json();
}

export async function importSession(json: string) {
  const res = await fetch(`${API_BASE}/sessions/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json }),
  });
  if (!res.ok) throw new Error('Failed to import session');
  return res.json();
}