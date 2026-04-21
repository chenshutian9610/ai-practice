<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { useChatStore } from '../stores/chat';
import { useSettingsStore } from '../stores/settings';
import { storeToRefs } from 'pinia';
import MessageList from './MessageList.vue';
import InputArea from './InputArea.vue';
import ToolCallIndicator from './ToolCallIndicator.vue';

const route = useRoute();
const sessionStore = useSessionStore();
const chatStore = useChatStore();
const settingsStore = useSettingsStore();

const { currentSessionId } = storeToRefs(sessionStore);
const { loading, streaming } = storeToRefs(chatStore);
const { settings } = storeToRefs(settingsStore);

const currentSession = computed(() => {
  return sessionStore.sessions.find(s => s.id === currentSessionId.value);
});

const toolCalls = computed(() => {
  if (!currentSessionId.value) return [];
  return chatStore.getToolCalls(currentSessionId.value);
});

// Load messages when session changes
watch(currentSessionId, async (newVal) => {
  if (newVal) {
    await chatStore.fetchMessages(newVal);
  }
}, { immediate: true });

// Send message handler
async function handleSendMessage(content: string) {
  if (!currentSessionId.value) {
    const session = await sessionStore.createSession('新会话');
    await chatStore.fetchMessages(session.id);
  }

  try {
    await chatStore.sendMessageWithStream(currentSessionId.value!, content, () => {});
  } catch (error) {
    console.error('Failed to send message:', error);
    alert('发送消息失败，请检查设置');
  }
}

// Refresh sessions on mount
sessionStore.fetchSessions();
settingsStore.fetchSettings();
</script>

<template>
  <div class="chat-window">
    <template v-if="currentSessionId">
      <div class="chat-header">
        <ToolCallIndicator v-if="streaming && toolCalls.length > 0" :toolCalls="toolCalls" />
      </div>
      <MessageList :sessionId="currentSessionId" />
      <InputArea :disabled="streaming" @submit="handleSendMessage" />
    </template>

    <template v-else>
      <div class="no-session">
        <div class="no-session-icon">💬</div>
        <h2>欢迎使用 Web Agent Chat</h2>
        <p>选择一个会话或创建新会话开始聊天</p>
        <button class="start-btn" @click="sessionStore.createSession()">
          创建新会话
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  position: relative;
}

.chat-header {
  padding: 8px 16px;
}

.no-session {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--text-primary);
}

.no-session-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.no-session h2 {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 500;
}

.no-session p {
  margin: 0 0 24px 0;
  color: var(--text-muted);
  font-size: 14px;
}

.start-btn {
  padding: 12px 24px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.start-btn:hover {
  background: var(--accent-hover);
}
</style>