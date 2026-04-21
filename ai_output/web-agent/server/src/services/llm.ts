export interface LLMConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// OpenAI-compatible tool format
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
}

// 同步调用 LLM
export async function chat(config: LLMConfig, messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
  if (!config.endpoint || !config.apiKey) {
    throw new Error('LLM not configured. Please set API endpoint and key in settings.');
  }

  // 确保 endpoint 正确
  const baseUrl = config.endpoint.replace(/\/$/, '');
  const apiUrl = baseUrl.includes('/v1') ? baseUrl : `${baseUrl}/v1`;

  const requestBody: any = {
    model: config.model,
    messages,
    stream: false,
  };

  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = 'auto';
  }

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;

  const result: LLMResponse = {
    content: message?.content || '',
  };

  // Handle reasoning content if present
  if (message?.reasoning_content) {
    result.reasoning = message.reasoning_content;
  }

  // Handle tool calls
  if (message?.tool_calls && message.tool_calls.length > 0) {
    result.toolCalls = message.tool_calls.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}'),
    }));
  }

  return result;
}

// 流式调用 LLM
export async function* chatStream(config: LLMConfig, messages: ChatMessage[], tools?: ToolDefinition[]): AsyncGenerator<{ content: string; reasoning: string }> {
  console.log('chatStream called with config:', { endpoint: config.endpoint, hasApiKey: !!config.apiKey, model: config.model });
  if (!config.endpoint || !config.apiKey) {
    throw new Error('LLM not configured. Please set API endpoint and key in settings.');
  }

  // 确保 endpoint 正确
  const baseUrl = config.endpoint.replace(/\/$/, '');
  const apiUrl = baseUrl.includes('/v1') ? baseUrl : `${baseUrl}/v1`;

  const requestBody: any = {
    model: config.model,
    messages,
    stream: true,
  };

  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = 'auto';
  }

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
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
        const content = parsed.choices?.[0]?.delta?.content || '';
        const reasoning = parsed.choices?.[0]?.delta?.reasoning_content || '';
        if (content || reasoning) {
          yield { content, reasoning };
        }
      } catch {
        // 跳过无法解析的行
      }
    }
  }
}