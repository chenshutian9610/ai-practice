import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '../api/rest';
import type { ToolCallEvent } from '../api/rest';
import { useSessionStore } from './session';
import { useSettingsStore } from './settings';

export interface ToolCallLog {
  name: string;
  arguments: any;
  result?: string;
  error?: string;
}

export interface DebugInfo {
  messageId: string;
  request: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: Array<{ name: string; description?: string }>;
  };
  response: {
    content: string;
    reasoning?: string;
    toolCalls?: Array<{
      id: string;
      name: string;
      arguments: any;
    }>;
  };
  toolCallLogs: ToolCallLog[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  created_at: string;
}

export interface ToolCallStatus {
  tool: string;
  status: 'calling' | 'success' | 'error';
  result?: string;
  error?: string;
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Record<string, Message[]>>({});
  const loading = ref(false);
  const streaming = ref(false);
  const stopped = ref(false);
  const toolCalls = ref<Record<string, ToolCallStatus[]>>({});
  const debugInfo = ref<Record<string, DebugInfo>>({});
  let abortController: AbortController | null = null;
  let currentDebugInfo: DebugInfo | null = null;

  function stopStream() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  async function fetchMessages(sessionId: string) {
    loading.value = true;
    try {
      const session = await api.getSession(sessionId);
      messages.value[sessionId] = session.messages || [];
    } finally {
      loading.value = false;
    }
  }

  async function sendMessage(sessionId: string, content: string) {
    loading.value = true;
    try {
      const { userMessage, assistantMessage } = await api.sendMessage(sessionId, content);

      if (!messages.value[sessionId]) {
        messages.value[sessionId] = [];
      }
      messages.value[sessionId].push(userMessage);
      messages.value[sessionId].push(assistantMessage);

      return assistantMessage;
    } finally {
      loading.value = false;
    }
  }

  function clearToolCalls(sessionId: string) {
    toolCalls.value[sessionId] = [];
  }

  function addToolCall(sessionId: string, tool: string) {
    if (!toolCalls.value[sessionId]) {
      toolCalls.value[sessionId] = [];
    }
    toolCalls.value[sessionId].push({
      tool,
      status: 'calling',
    });
  }

  function updateToolCall(sessionId: string, tool: string, result?: string, error?: string) {
    const calls = toolCalls.value[sessionId];
    if (!calls) return;

    const call = calls.find(c => c.tool === tool && c.status === 'calling');
    if (call) {
      call.status = error ? 'error' : 'success';
      call.result = result;
      call.error = error;
    }
  }

  function getToolCalls(sessionId: string): ToolCallStatus[] {
    return toolCalls.value[sessionId] || [];
  }

  function startDebugInfo(messageId: string, request: DebugInfo['request']) {
    currentDebugInfo = {
      messageId,
      request,
      response: { content: '', reasoning: '' },
      toolCallLogs: [],
    };
  }

  function updateDebugResponse(response: Partial<DebugInfo['response']>) {
    if (currentDebugInfo) {
      currentDebugInfo.response = { ...currentDebugInfo.response, ...response };
    }
  }

  function addToolCallLog(log: ToolCallLog) {
    if (currentDebugInfo) {
      currentDebugInfo.toolCallLogs.push(log);
    }
  }

  function finalizeDebugInfo() {
    if (currentDebugInfo) {
      debugInfo.value[currentDebugInfo.messageId] = currentDebugInfo;
      currentDebugInfo = null;
    }
  }

  function getDebugInfo(messageId: string): DebugInfo | null {
    return debugInfo.value[messageId] || null;
  }

  async function sendMessageWithStream(
    sessionId: string,
    content: string,
    onChunk: (content: string, reasoning: string) => void,
    onToolEvent?: (event: ToolCallEvent) => void
  ) {
    streaming.value = true;
    stopped.value = false;
    clearToolCalls(sessionId);

    // Add user message immediately
    const tempId = `temp-${Date.now()}`;
    if (!messages.value[sessionId]) {
      messages.value[sessionId] = [];
    }
    messages.value[sessionId].push({
      id: tempId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    });

    // Create placeholder for AI response
    const aiMessageId = `ai-${Date.now()}`;
    messages.value[sessionId].push({
      id: aiMessageId,
      role: 'assistant',
      content: '',
      reasoning: '',
      created_at: new Date().toISOString(),
    });

    // Build messages for debug info (get previous messages + current user message)
    const sessionMessages = messages.value[sessionId]
      .filter(m => m.id !== aiMessageId)
      .map(m => ({ role: m.role, content: m.content }));

    // Get model from session or settings
    const sessionStore = useSessionStore();
    const settingsStore = useSettingsStore();
    const currentModel = sessionStore.currentModel || settingsStore.settings.model;

    // Build request for debug info
    const debugRequest = {
      model: currentModel,
      messages: sessionMessages,
    };
    startDebugInfo(aiMessageId, debugRequest);

    let fullContent = '';
    let fullReasoning = '';

    // Create abort controller for this request
    abortController = new AbortController();

    try {
      await api.sendMessageStream(sessionId, content, (content, reasoning) => {
        fullContent += content;
        fullReasoning += reasoning;
        const lastMsg = messages.value[sessionId].find(m => m.id === aiMessageId);
        if (lastMsg) {
          lastMsg.content = fullContent;
          lastMsg.reasoning = fullReasoning;
        }
        updateDebugResponse({ content: fullContent, reasoning: fullReasoning });
        onChunk(content, reasoning);
      }, (event) => {
        if (event.type === 'tool_call') {
          addToolCall(sessionId, event.tool);
          addToolCallLog({ name: event.tool, arguments: event.input });
        } else if (event.type === 'tool_result') {
          updateToolCall(sessionId, event.tool, event.result);
          if (currentDebugInfo && currentDebugInfo.toolCallLogs.length > 0) {
            const lastLog = currentDebugInfo.toolCallLogs[currentDebugInfo.toolCallLogs.length - 1];
            lastLog.result = event.result;
          }
        } else if (event.type === 'tool_error') {
          updateToolCall(sessionId, event.tool, undefined, event.error);
          if (currentDebugInfo && currentDebugInfo.toolCallLogs.length > 0) {
            const lastLog = currentDebugInfo.toolCallLogs[currentDebugInfo.toolCallLogs.length - 1];
            lastLog.error = event.error;
          }
        }
        if (onToolEvent) {
          onToolEvent(event);
        }
      }, abortController.signal);
    } catch (error) {
      // Check if aborted - handle both browser and potential Node.js error types
      const errorName = (error as Error).name;
      const errorMessage = (error as Error).message || '';
      const isAbortError =
        errorName === 'AbortError' ||
        errorName === 'CanceledError' ||
        errorMessage.includes('abort') ||
        errorMessage.includes('cancel') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('network');

      if (isAbortError) {
        stopped.value = true;
        // Keep the partial message content
      } else {
        // Remove AI message on other errors
        messages.value[sessionId] = messages.value[sessionId].filter(m => m.id !== aiMessageId);
        throw error;
      }
    } finally {
      finalizeDebugInfo();
      streaming.value = false;
      abortController = null;
    }
  }

  function getMessages(sessionId: string): Message[] {
    return messages.value[sessionId] || [];
  }

  function clearMessages(sessionId: string) {
    messages.value[sessionId] = [];
    toolCalls.value[sessionId] = [];
  }

  return {
    messages,
    loading,
    streaming,
    stopped,
    fetchMessages,
    sendMessage,
    sendMessageWithStream,
    getMessages,
    clearMessages,
    getToolCalls,
    clearToolCalls,
    stopStream,
    debugInfo,
    getDebugInfo,
  };
});