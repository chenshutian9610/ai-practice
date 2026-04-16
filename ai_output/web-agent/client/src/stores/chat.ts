import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '../api/rest';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  created_at: string;
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Record<string, Message[]>>({});
  const loading = ref(false);
  const streaming = ref(false);

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

  async function sendMessageWithStream(
    sessionId: string,
    content: string,
    onChunk: (content: string, reasoning: string) => void
  ) {
    streaming.value = true;

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

    let fullContent = '';
    let fullReasoning = '';

    try {
      await api.sendMessageStream(sessionId, content, (content, reasoning) => {
        fullContent += content;
        fullReasoning += reasoning;
        const lastMsg = messages.value[sessionId].find(m => m.id === aiMessageId);
        if (lastMsg) {
          lastMsg.content = fullContent;
          lastMsg.reasoning = fullReasoning;
        }
        onChunk(content, reasoning);
      });
    } catch (error) {
      // Remove AI message on error
      messages.value[sessionId] = messages.value[sessionId].filter(m => m.id !== aiMessageId);
      throw error;
    } finally {
      streaming.value = false;
    }
  }

  function getMessages(sessionId: string): Message[] {
    return messages.value[sessionId] || [];
  }

  function clearMessages(sessionId: string) {
    messages.value[sessionId] = [];
  }

  return {
    messages,
    loading,
    streaming,
    fetchMessages,
    sendMessage,
    sendMessageWithStream,
    getMessages,
    clearMessages,
  };
});