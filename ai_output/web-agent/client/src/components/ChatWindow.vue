<script setup lang="ts">
import { computed, watch, ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { useChatStore } from '../stores/chat';
import { useSettingsStore } from '../stores/settings';
import { storeToRefs } from 'pinia';
import MessageList from './MessageList.vue';
import InputArea from './InputArea.vue';
import ToolCallIndicator from './ToolCallIndicator.vue';
import ModelSelector from './ModelSelector.vue';

const route = useRoute();
const sessionStore = useSessionStore();
const chatStore = useChatStore();
const settingsStore = useSettingsStore();

const { currentSessionId, currentModel } = storeToRefs(sessionStore);
const { loading, streaming } = storeToRefs(chatStore);
const { settings } = storeToRefs(settingsStore);

const currentSession = computed(() => {
  return sessionStore.sessions.find(s => s.id === currentSessionId.value);
});

const toolCalls = computed(() => {
  if (!currentSessionId.value) return [];
  return chatStore.getToolCalls(currentSessionId.value);
});

// Double ESC handling for stopping stream
const lastEscTime = ref(0);
const ESC_DOUBLE_THRESHOLD = 300; // ms

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && streaming.value) {
    const now = Date.now();
    if (now - lastEscTime.value < ESC_DOUBLE_THRESHOLD) {
      chatStore.stopStream();
      lastEscTime.value = 0;
    } else {
      lastEscTime.value = now;
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
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

// Handle model change
async function handleModelChange(model: string) {
  await sessionStore.updateSessionModel(model);
}

// Handle stop stream
function handleStop() {
  chatStore.stopStream();
}

// Refresh sessions on mount
sessionStore.fetchSessions();
settingsStore.fetchSettings();
</script>

<template>
  <div class="chat-window">
    <template v-if="currentSessionId">
      <div class="chat-header">
        <div class="header-left">
          <div class="header-brand">
            <svg class="brand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
          </div>
          <ModelSelector
            :model="currentModel"
            @update:model="handleModelChange"
          />
        </div>
        <ToolCallIndicator v-if="streaming && toolCalls.length > 0" :toolCalls="toolCalls" />
      </div>
      <MessageList :sessionId="currentSessionId" />
      <InputArea :disabled="streaming" :streaming="streaming" @submit="handleSendMessage" @stop="handleStop" />
    </template>

    <template v-else>
      <div class="no-session">
        <div class="no-session-illustration">
          <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="80" cy="80" r="60" stroke="var(--border)" stroke-width="1.5" stroke-dasharray="6 6" class="rotating"/>
            <circle cx="80" cy="80" r="45" stroke="var(--accent-ai)" stroke-width="1.5" opacity="0.3"/>
            <rect x="55" y="55" width="50" height="50" rx="12" stroke="var(--accent-ai)" stroke-width="2" fill="none"/>
            <path d="M70 80L75 85L90 70" stroke="var(--accent-ai)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="check-path"/>
          </svg>
        </div>
        <h2 class="no-session-title">Web Agent Chat</h2>
        <p class="no-session-subtitle">选择会话或创建新对话开始</p>
        <button class="start-btn" @click="sessionStore.createSession()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-brand {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-ai) 0%, var(--accent-ai-soft) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: var(--shadow-glow-ai);
}

/* No Session State */
.no-session {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 48px 24px;
  background:
    radial-gradient(ellipse at 50% 30%, var(--accent-ai-glow) 0%, transparent 50%),
    var(--bg-primary);
}

.no-session-illustration {
  opacity: 0.9;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(2deg); }
}

.rotating {
  animation: rotate 20s linear infinite;
  transform-origin: center;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.check-path {
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
  animation: draw 1.5s ease-out 0.5s forwards;
}

@keyframes draw {
  to { stroke-dashoffset: 0; }
}

.no-session-title {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 36px;
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 0.02em;
}

.no-session-subtitle {
  font-size: 15px;
  color: var(--text-muted);
  margin: 0;
}

.start-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: linear-gradient(135deg, var(--accent-ai) 0%, var(--accent-ai-soft) 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  box-shadow: var(--shadow-glow-ai);
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px var(--accent-ai-glow);
}

.start-btn:active {
  transform: translateY(0);
}
</style>