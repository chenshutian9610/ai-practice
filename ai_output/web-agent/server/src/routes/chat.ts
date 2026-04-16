import { Router } from 'express';
import * as models from '../services/models.js';
import { chat, chatStream } from '../services/llm.js';
import { saveDatabase } from '../services/database.js';

const router = Router();

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

    // 调用 LLM
    const response = await chat(
      {
        endpoint: settings.api_endpoint,
        apiKey: finalApiKey,
        model: settings.model,
      },
      messages
    );

    // 保存 AI 回复
    const assistantMessage = models.createMessage(sessionId, 'assistant', response.content);

    // 如果是第一条消息，更新会话标题
    if (history.length === 0) {
      // 使用用户消息的前 20 个字符作为标题
      const title = content.slice(0, 20) + (content.length > 20 ? '...' : '');
      models.updateSessionTitle(sessionId, title);
    }

    res.json({
      userMessage,
      assistantMessage,
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

    // 存储 AI 消息
    const assistantMessage = models.createMessage(sessionId, 'assistant', '', '');

    // 流式调用 LLM
    let fullContent = '';
    let fullReasoning = '';
    for await (const chunk of chatStream(
      {
        endpoint: settings.api_endpoint,
        apiKey: finalApiKey,
        model: settings.model,
      },
      messages
    )) {
      fullContent += chunk.content;
      fullReasoning += chunk.reasoning;
      res.write(`data: ${JSON.stringify({ content: chunk.content, reasoning: chunk.reasoning, messageId: assistantMessage.id })}\n\n`);
    }

    // 流式完成后更新 AI 消息内容
    models.updateMessageContent(assistantMessage.id, fullContent, fullReasoning);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Chat stream error:', error);
    res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    res.end();
  }
});

export default router;