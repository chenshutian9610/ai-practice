import { fetch } from 'undici';
import http from 'http';
import https from 'https';

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

// Use native http/https module to bypass proxy
async function directFetch(url: string, options: any): Promise<{ ok: boolean; status: number; json: () => Promise<any>; text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const httpOptions: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = transport.request(httpOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode || 0,
          json: async () => JSON.parse(data),
          text: async () => data,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// 同步调用 LLM
export async function chat(config: LLMConfig, messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
  if (!config.endpoint || !config.apiKey) {
    throw new Error('LLM not configured. Please set API endpoint and key in settings.');
  }

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

  const url = `${apiUrl}/chat/completions`;

  const response = await directFetch(url, {
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

  if (message?.reasoning_content) {
    result.reasoning = message.reasoning_content;
  }

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
export async function* chatStream(
  config: LLMConfig,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
  signal?: AbortSignal
): AsyncGenerator<{ content: string; reasoning: string }> {
  console.log('chatStream: starting');
  if (!config.endpoint || !config.apiKey) {
    throw new Error('LLM not configured. Please set API endpoint and key in settings.');
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  let aborted = false;
  const abortHandler = () => {
    aborted = true;
  };
  signal?.addEventListener('abort', abortHandler);

  try {
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

    const parsedUrl = new URL(`${apiUrl}/chat/completions`);
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const httpOptions: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
    };

    console.log('chatStream: making request to', parsedUrl.href);

    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = transport.request(httpOptions, (res) => {
        console.log('chatStream: got response, status:', res.statusCode);
        resolve(res);
      });
      req.on('error', (err) => {
        console.log('chatStream: request error:', err.message);
        reject(err);
      });
      req.setTimeout(60000, () => {
        console.log('chatStream: request timeout');
        req.destroy();
        reject(new Error('Request timeout'));
      });
      if (signal) {
        signal.addEventListener('abort', () => {
          console.log('chatStream: abort signal received');
          req.destroy();
        });
      }
      req.write(JSON.stringify(requestBody));
      req.end();
    });

    console.log('chatStream: response received');

    if (response.statusCode !== undefined && response.statusCode >= 400) {
      let errorText = '';
      response.on('data', (chunk) => { errorText += chunk; });
      response.on('end', () => {
        console.log('chatStream: error response:', errorText);
        throw new Error(`LLM API error: ${response.statusCode} - ${errorText}`);
      });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    // Use a queue to store incoming chunks
    const chunkQueue: Buffer[] = [];
    let resolveNext: ((value: Buffer | null) => void) | null = null;

    response.on('data', (chunk: Buffer) => {
      console.log('chatStream: got data chunk, length:', chunk.length);
      chunkQueue.push(chunk);
      if (resolveNext) {
        const resolve = resolveNext;
        resolveNext = null;
        resolve(chunkQueue.shift() || null);
      }
    });

    response.on('end', () => {
      console.log('chatStream: response ended');
      if (resolveNext) {
        const resolve = resolveNext;
        resolveNext = null;
        resolve(null);
      }
    });

    response.on('error', (err) => {
      console.log('chatStream: response error:', err.message);
      if (resolveNext) {
        const resolve = resolveNext;
        resolveNext = null;
        resolve(null);
      }
    });

    while (true) {
      if (aborted || signal?.aborted) {
        console.log('chatStream: aborting loop');
        response.destroy();
        throw new DOMException('Aborted', 'AbortError');
      }

      // Get next chunk
      let chunk: Buffer | null = null;

      if (chunkQueue.length > 0) {
        chunk = chunkQueue.shift()!;
      } else {
        chunk = await new Promise<Buffer | null>((resolve) => {
          resolveNext = resolve;
          // Check abort periodically
          const checkInterval = setInterval(() => {
            if (aborted || signal?.aborted) {
              clearInterval(checkInterval);
              resolve(null);
            }
          }, 50);
          response.once('data', () => clearInterval(checkInterval));
          response.once('end', () => {
            clearInterval(checkInterval);
            resolve(null);
          });
        });
      }

      if (!chunk) {
        console.log('chatStream: no more chunks');
        break;
      }

      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          console.log('chatStream: received [DONE]');
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          const reasoning = parsed.choices?.[0]?.delta?.reasoning_content || '';
          if (content || reasoning) {
            console.log('chatStream: yielding chunk');
            yield { content, reasoning };
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    signal?.removeEventListener('abort', abortHandler);
    console.log('chatStream: cleanup');
  }
}
