import { Router } from 'express';
import * as models from '../services/models.js';
import { chat, chatStream } from '../services/llm.js';
import { saveDatabase } from '../services/database.js';
import { getMCPClientManager } from '../mcp/manager.js';
import { ToolDefinition, ToolCall } from '../services/llm.js';
import { MCPTool } from '../mcp/types.js';

const router = Router();

const MAX_TOOL_CALL_ITERATIONS = 10;

interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  result: string;
  error?: string;
}

// Convert MCP tools to LLM tool format (OpenAI-compatible format)
function convertToolsForLLM(tools: Array<MCPTool & { serverId: string; serverName: string }>): { type: string; function: { name: string; description?: string; parameters: { type: string; properties: Record<string, unknown>; required?: string[] } } }[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || `Tool from ${tool.serverName}`,
      parameters: {
        type: 'object',
        properties: (tool.inputSchema?.properties as Record<string, unknown>) || {},
        required: tool.inputSchema?.required || [],
      },
    },
  }));
}

// 发送消息（非流式）
router.post('/', async (req, res) => {
  try {
    const { sessionId, content } = req.body;
    const apiKey = req.headers['x-api-key'] as string;

    if (!sessionId || !content) {
      return res.status(400).json({ error: 'sessionId and content are required' });
    }

    // 检查会话是否存在
    const session = models.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 保存用户消息
    const userMessage = models.createMessage(sessionId, 'user', content);

    // 获取 LLM 配置
    const settings = models.getSettings();
    // Use header API key if provided, otherwise use stored
    const finalApiKey = apiKey || settings.api_key;

    // 构建消息列表
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

    // 添加 System Prompt
    if (settings.system_prompt) {
      messages.push({ role: 'system', content: settings.system_prompt });
    }

    // 添加历史消息
    const history = models.getMessagesBySessionId(sessionId);
    for (const msg of history) {
      if (msg.id !== userMessage.id) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content: userMessage.content });

    // 初始化 MCP 客户端
    const mcpManager = getMCPClientManager();
    const tools = mcpManager.isInitialized() ? mcpManager.getAllTools() : [];
    const llmTools = tools.length > 0 ? convertToolsForLLM(tools) : undefined;

    // 调用 LLM
    const response = await chat(
      {
        endpoint: settings.api_endpoint,
        apiKey: finalApiKey,
        model: settings.model,
      },
      messages,
      llmTools
    );

    // 保存 AI 回复
    let assistantMessage = models.createMessage(sessionId, 'assistant', response.content);

    // 处理工具调用循环
    let toolCallResults: ToolCallResult[] = [];
    let iteration = 0;

    while (response.toolCalls && response.toolCalls.length > 0 && iteration < MAX_TOOL_CALL_ITERATIONS) {
      iteration++;

      // 执行工具调用
      const toolPromises = response.toolCalls.map(async (tc: ToolCall) => {
        try {
          const { result, serverName } = await mcpManager.callTool(tc.name, tc.arguments);
          return {
            toolCallId: tc.id,
            toolName: tc.name,
            result: typeof result === 'string' ? result : JSON.stringify(result),
            error: undefined,
          };
        } catch (error) {
          return {
            toolCallId: tc.id,
            toolName: tc.name,
            result: '',
            error: String(error),
          };
        }
      });

      toolCallResults = await Promise.all(toolPromises);

      // 添加助手消息（包含工具调用）
      const toolCallMessage = models.createMessage(sessionId, 'assistant',
        '', '', `Tool calls: ${JSON.stringify(response.toolCalls)}`);

      // 将工具调用结果添加到消息上下文
      const toolResultsContent = toolCallResults.map(r =>
        r.error
          ? `Tool "${r.toolName}" error: ${r.error}`
          : `Tool "${r.toolName}" result: ${r.result}`
      ).join('\n');

      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: `Tool results:\n${toolResultsContent}`,
      });

      // 再次调用 LLM
      const nextResponse = await chat(
        {
          endpoint: settings.api_endpoint,
          apiKey: finalApiKey,
          model: settings.model,
        },
        messages,
        llmTools
      );

      response.content = nextResponse.content;
      response.reasoning = nextResponse.reasoning;

      // 更新助手消息
      assistantMessage.content = nextResponse.content;
      models.updateMessageContent(assistantMessage.id, nextResponse.content, nextResponse.reasoning || '');

      if (!nextResponse.toolCalls || nextResponse.toolCalls.length === 0) {
        break;
      }
    }

    // 如果是第一条消息，更新会话标题
    if (history.length === 0) {
      // 使用用户消息的前 20 个字符作为标题
      const title = content.slice(0, 20) + (content.length > 20 ? '...' : '');
      models.updateSessionTitle(sessionId, title);
    }

    res.json({
      userMessage,
      assistantMessage,
      toolCallResults,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: String(error) });
  }
});

// 流式聊天
router.post('/stream', async (req, res) => {
  try {
    const { sessionId, content } = req.body;
    const apiKey = req.headers['x-api-key'] as string;

    if (!sessionId || !content) {
      return res.status(400).json({ error: 'sessionId and content are required' });
    }

    // 检查会话是否存在
    const session = models.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 保存用户消息
    const userMessage = models.createMessage(sessionId, 'user', content);

    // 获取 LLM 配置
    const settings = models.getSettings();
    // Use header API key if provided, otherwise use stored
    const finalApiKey = apiKey || settings.api_key;

    // 构建消息列表
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

    // 添加 System Prompt
    if (settings.system_prompt) {
      messages.push({ role: 'system', content: settings.system_prompt });
    }

    // 添加历史消息
    const history = models.getMessagesBySessionId(sessionId);
    for (const msg of history) {
      if (msg.id !== userMessage.id) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content: userMessage.content });

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 如果是第一条消息，更新会话标题
    if (history.length === 0) {
      const title = content.slice(0, 20) + (content.length > 20 ? '...' : '');
      models.updateSessionTitle(sessionId, title);
    }

    // 初始化 MCP 客户端
    const mcpManager = getMCPClientManager();
    const tools = mcpManager.isInitialized() ? mcpManager.getAllTools() : [];
    const llmTools = tools.length > 0 ? convertToolsForLLM(tools) : undefined;

    // 存储 AI 消息
    const assistantMessage = models.createMessage(sessionId, 'assistant', '', '');

    // 工具调用循环
    let iteration = 0;
    let hasToolCalls = false;
    let lastToolCalls: ToolCall[] = [];
    let finalContent = '';
    let finalReasoning = '';
    let currentToolCalls: ToolCall[] = [];

    do {
      iteration++;
      hasToolCalls = false;

      // 流式调用 LLM
      let fullContent = '';
      let fullReasoning = '';

      for await (const chunk of chatStream(
        {
          endpoint: settings.api_endpoint,
          apiKey: finalApiKey,
          model: settings.model,
        },
        messages,
        llmTools
      )) {
        fullContent += chunk.content;
        fullReasoning += chunk.reasoning;
        res.write(`data: ${JSON.stringify({ content: chunk.content, reasoning: chunk.reasoning, messageId: assistantMessage.id })}\n\n`);
      }

      // 只有在有工具可用时才检查工具调用
      // 如果没有工具，直接完成响应
      if (!llmTools || llmTools.length === 0) {
        finalContent = fullContent;
        finalReasoning = fullReasoning;
        break;
      }

      // 检查是否有工具调用
      // 由于流式响应无法直接获取 tool_calls，我们需要使用非流式调用来获取
      const llmResponse = await chat(
        {
          endpoint: settings.api_endpoint,
          apiKey: finalApiKey,
          model: settings.model,
        },
        messages,
        llmTools
      );

      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        hasToolCalls = true;
        currentToolCalls = llmResponse.toolCalls;
        lastToolCalls = llmResponse.toolCalls;
        fullContent = llmResponse.content;

        // 发送工具调用事件
        for (const tc of currentToolCalls) {
          res.write(`data: ${JSON.stringify({
            type: 'tool_call',
            tool: tc.name,
            toolCallId: tc.id,
            input: tc.arguments,
          })}\n\n`);
        }

        // 执行工具调用
        const toolPromises = currentToolCalls.map(async (tc: ToolCall) => {
          try {
            const { result, serverName } = await mcpManager.callTool(tc.name, tc.arguments);
            const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
            res.write(`data: ${JSON.stringify({
              type: 'tool_result',
              tool: tc.name,
              toolCallId: tc.id,
              result: resultStr,
            })}\n\n`);
            return {
              toolCallId: tc.id,
              toolName: tc.name,
              result: resultStr,
              error: undefined,
            };
          } catch (error) {
            const errorMsg = String(error);
            res.write(`data: ${JSON.stringify({
              type: 'tool_error',
              tool: tc.name,
              toolCallId: tc.id,
              error: errorMsg,
            })}\n\n`);
            return {
              toolCallId: tc.id,
              toolName: tc.name,
              result: '',
              error: errorMsg,
            };
          }
        });

        const toolCallResults = await Promise.all(toolPromises);

        // 将 LLM 回复和工具调用结果添加到消息上下文
        messages.push({ role: 'assistant', content: fullContent });
        const toolResultsContent = toolCallResults.map(r =>
          r.error
            ? `Tool "${r.toolName}" error: ${r.error}`
            : `Tool "${r.toolName}" result: ${r.result}`
        ).join('\n');
        messages.push({
          role: 'user',
          content: `Tool results:\n${toolResultsContent}`,
        });
      } else {
        // 没有更多工具调用，保存最终内容
        finalContent = fullContent;
        finalReasoning = fullReasoning;
        break;
      }
    } while (hasToolCalls && iteration < MAX_TOOL_CALL_ITERATIONS);

    // 流式完成后更新 AI 消息内容
    models.updateMessageContent(assistantMessage.id, finalContent, finalReasoning);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Chat stream error:', error);
    res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    res.end();
  }
});

export default router;
