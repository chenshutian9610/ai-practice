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
function convertToolsForLLM(tools: Array<MCPTool & { serverId: string; serverName: string }>): Array<{ type: 'function'; function: { name: string; description?: string; parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] } } }> {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description || `Tool from ${tool.serverName}`,
      parameters: {
        type: 'object' as const,
        properties: (tool.inputSchema?.properties as Record<string, unknown>) || {},
        required: tool.inputSchema?.required || [],
      },
    },
  }));
}

// 发送消息（非流式）
router.post('/', async (req, res) => {
  try {
    const { sessionId, content, model } = req.body;
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
    // Use provided model, session model, or default model
    const finalModel = model || session.model || settings.model;

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
        model: finalModel,
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
          model: finalModel,
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
    const { sessionId, content, model } = req.body;
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
    // Use provided model, session model, or default model
    const finalModel = model || session.model || settings.model;

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
    console.log('llmTools:', llmTools ? 'enabled' : 'disabled');

    // 存储 AI 消息
    const assistantMessage = models.createMessage(sessionId, 'assistant', '', '');

    // Create abort controller linked to client disconnect
    const abortController = new AbortController();
    let clientDisconnected = false;
    const clientDisconnectedHandler = () => {
      clientDisconnected = true;
      // Don't abort immediately - let the stream complete and check afterwards
    };
    req.on('close', clientDisconnectedHandler);
    const streamSignal = abortController.signal;

    // 工具调用循环
    let iteration = 0;
    let hasToolCalls = false;
    let toolsJustExecuted = false; // 标记工具是否刚刚执行过（需要让模型处理结果）
    let lastToolCalls: ToolCall[] = [];
    let finalContent = '';
    let finalReasoning = '';
    let currentToolCalls: ToolCall[] = [];
    let fullContent = '';
    let fullReasoning = '';
    let streamedToolCalls: ToolCall[] = [];

    do {
      iteration++;
      console.log('Loop iteration:', iteration, 'hasToolCalls:', hasToolCalls, 'toolsJustExecuted:', toolsJustExecuted);
      console.log('About to call chatStream...');
      // Reset content for this iteration
      fullContent = '';
      fullReasoning = '';
      streamedToolCalls = [];
      toolsJustExecuted = false; // 重置标记

      try {
        for await (const chunk of chatStream(
          {
            endpoint: settings.api_endpoint,
            apiKey: finalApiKey,
            model: finalModel,
          },
          messages,
          llmTools,
          streamSignal
        )) {
          // 检查客户端是否已断开
          if (res.writableEnded) {
            break;
          }
          fullContent += chunk.content;
          fullReasoning += chunk.reasoning;

          // Collect tool calls from stream
          if (chunk.toolCalls && chunk.toolCalls.length > 0) {
            streamedToolCalls.push(...chunk.toolCalls);
          }

          res.write(`data: ${JSON.stringify({ content: chunk.content, reasoning: chunk.reasoning, messageId: assistantMessage.id })}\n\n`);
          res.flush?.(); // 确保数据立即发送
        }
        console.log('chatStream completed, streamedToolCalls:', streamedToolCalls.length);
      } catch (error) {
        // 处理 AbortError
        if ((error as Error).name === 'AbortError') {
          // 保存已生成的部分内容
          if (fullContent) {
            models.updateMessageContent(assistantMessage.id, fullContent, fullReasoning);
          }
          return;
        }
        // 其他错误继续抛出
        throw error;
      }

      // 只有在有工具可用时才检查工具调用
      // 如果没有工具，直接完成响应
      if (!llmTools || llmTools.length === 0) {
        finalContent = fullContent;
        finalReasoning = fullReasoning;
        // 仍然继续执行到循环外发送 debug_info
      } else {
        // 使用流式响应中收集到的工具调用
        const currentToolCalls = streamedToolCalls;

        console.log('Checking tool calls, count:', currentToolCalls?.length || 0);
        if (currentToolCalls && currentToolCalls.length > 0) {
          hasToolCalls = true;
          console.log('Tool calls found, hasToolCalls set to true');
          lastToolCalls = currentToolCalls;

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

          // 标记工具刚执行过，确保循环继续让模型处理结果
          toolsJustExecuted = true;
          console.log('Tools executed, toolsJustExecuted set to true');
          console.log('Stream status before loop condition: res.writableEnded=', res.writableEnded, 'clientDisconnected=', clientDisconnected);
        } else {
          // 没有更多工具调用，保存最终内容
          finalContent = fullContent;
          finalReasoning = fullReasoning;
          console.log('No more tool calls, breaking loop');
          break;
        }
      }
    } while (
      (hasToolCalls || toolsJustExecuted) && // 有新工具调用 或 工具刚执行过（需要让模型处理结果）
      iteration < MAX_TOOL_CALL_ITERATIONS &&
      (toolsJustExecuted || (!clientDisconnected && !res.writableEnded)) // 如果工具刚执行过，忽略断开状态
    );

    // 注意: clientDisconnected 在流结束后可能为 true (因为客户端关闭了 SSE 连接)
    // 但只要有内容，我们仍然应该发送 debug_info

    // 检查客户端是否已断开且没有任何内容
    if ((clientDisconnected || res.writableEnded) && !fullContent && !finalContent) {
      // 没有内容，直接结束
      return;
    }

    // 有内容的情况下，即使 clientDisconnected 也要发送 debug_info

    // 流式完成后更新 AI 消息内容
    models.updateMessageContent(assistantMessage.id, finalContent || fullContent, finalReasoning || fullReasoning);

    console.log('DEBUG: Sending debug_info, llmTools:', llmTools ? 'enabled' : 'disabled');
    // 发送调试信息
    res.write(`data: ${JSON.stringify({
      type: 'debug_info',
      request: {
        endpoint: settings.api_endpoint,
        model: finalModel,
        messages: messages,
        tools: llmTools,
      },
    })}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Chat stream error:', error);
    // Check if client disconnected (AbortError or premature close)
    if ((error as Error).name === 'AbortError' || (error as NodeJS.ErrnoException).code === 'ERR_STREAM_PREMATURE_CLOSE') {
      // 保存已生成的部分内容
      const partialContent = fullContent || '';
      if (partialContent) {
        models.updateMessageContent(assistantMessage.id, partialContent, fullReasoning);
      }
      return;
    }
    res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    res.end();
  }
});

export default router;
