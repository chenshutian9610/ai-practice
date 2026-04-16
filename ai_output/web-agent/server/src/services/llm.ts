export interface LLMConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
}

// 同步调用 LLM
export async function chat(config: LLMConfig, messages: ChatMessage[]): Promise<LLMResponse> {
  if (!config.endpoint || !config.apiKey) {
    throw new Error('LLM not configured. Please set API endpoint and key in settings.');
  }

  // 确保 endpoint 正确
  const baseUrl = config.endpoint.replace(/\/$/, '');
  const apiUrl = baseUrl.includes('/v1') ? baseUrl : `${baseUrl}/v1`;

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return { content };
}

// 流式调用 LLM
export async function* chatStream(config: LLMConfig, messages: ChatMessage[]): AsyncGenerator<{ content: string; reasoning: string }> {
  console.log('chatStream called with config:', { endpoint: config.endpoint, hasApiKey: !!config.apiKey, model: config.model });
  if (!config.endpoint || !config.apiKey) {
    throw new Error('LLM not configured. Please set API endpoint and key in settings.');
  }

  // 确保 endpoint 正确
  const baseUrl = config.endpoint.replace(/\/$/, '');
  const apiUrl = baseUrl.includes('/v1') ? baseUrl : `${baseUrl}/v1`;

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
    }),
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