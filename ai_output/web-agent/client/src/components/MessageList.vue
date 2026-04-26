<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useChatStore } from '../stores/chat';
import MessageItem from './MessageItem.vue';

const props = defineProps<{
  sessionId: string;
}>();

const chatStore = useChatStore();
const containerRef = ref<HTMLElement | null>(null);

const messages = computed(() => chatStore.getMessages(props.sessionId));
const streaming = computed(() => chatStore.streaming);

// Scroll to bottom when new messages arrive
watch(messages, async () => {
  await nextTick();
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight;
  }
}, { deep: true });
</script>

<template>
  <div class="message-list" ref="containerRef">
    <div v-if="messages.length === 0" class="empty-state">
      <div class="empty-illustration">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="50" stroke="var(--border)" stroke-width="2" stroke-dasharray="4 4"/>
          <path d="M45 50C45 47.2386 47.2386 45 50 45H70C72.7614 45 75 47.2386 75 50V65C75 67.7614 72.7614 70 70 70H58L50 80V70H50C47.2386 70 45 67.7614 45 65V50Z" stroke="var(--accent-ai)" stroke-width="2" fill="none"/>
          <circle cx="52" cy="57" r="2" fill="var(--accent-ai)"/>
          <circle cx="60" cy="57" r="2" fill="var(--accent-ai)"/>
          <circle cx="68" cy="57" r="2" fill="var(--accent-ai)"/>
        </svg>
      </div>
      <h3 class="empty-title">开始对话</h3>
      <p class="empty-hint">在下方输入框中输入您的问题</p>
    </div>

    <div v-else class="messages">
      <TransitionGroup name="message">
        <div
          v-for="(message, index) in messages"
          :key="message.id"
          class="message"
          :class="message.role"
          :style="{ '--index': index }"
        >
          <div class="message-avatar">
            <div v-if="message.role === 'user'" class="avatar-user">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div v-else class="avatar-ai">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
            </div>
          </div>
          <div class="message-bubble">
            <div class="bubble-tail"></div>
            <div class="message-content">
              <MessageItem
                :content="message.content"
                :reasoning="message.reasoning"
                :isStreaming="streaming && message === messages[messages.length - 1]"
                :messageId="message.id"
                :isAssistant="message.role === 'assistant'"
              />
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth;
  background:
    radial-gradient(ellipse at 50% 0%, var(--accent-ai-glow) 0%, transparent 50%),
    var(--bg-primary);
}

/* Custom Scrollbar */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.message-list::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 48px 24px;
  animation: fadeIn 0.6s ease-out;
}

.empty-illustration {
  opacity: 0.8;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.empty-title {
  font-family: 'Crimson Pro', 'Georgia', serif;
  font-size: 28px;
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 0.02em;
}

.empty-hint {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
}

/* Messages Container */
.messages {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
}

/* Message Animation */
.message-enter-active {
  animation: messageIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.message-leave-active {
  animation: messageOut 0.3s ease-in;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes messageOut {
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}

/* Individual Message */
.message {
  display: flex;
  gap: 16px;
  max-width: 85%;
  animation: messageIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(var(--index, 0) * 0.05s);
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

/* Avatar */
.message-avatar {
  flex-shrink: 0;
}

.avatar-user,
.avatar-ai {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.avatar-user {
  background: var(--user-msg-bg);
  color: var(--user-msg-text);
  box-shadow: var(--shadow-glow-user);
}

.avatar-ai {
  background: var(--bg-elevated);
  color: var(--accent-ai);
  border: 2px solid var(--border);
  box-shadow: var(--shadow-soft);
}

.message:hover .avatar-user {
  transform: scale(1.05);
}

.message:hover .avatar-ai {
  border-color: var(--accent-ai);
}

/* Bubble */
.message-bubble {
  position: relative;
  display: flex;
}

.message.user .message-bubble {
  flex-direction: row-reverse;
}

.bubble-tail {
  position: absolute;
  top: 12px;
  width: 0;
  height: 0;
}

.message.assistant .bubble-tail {
  left: -8px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 8px solid var(--ai-msg-bg);
}

.message.user .bubble-tail {
  right: -8px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 8px solid var(--user-msg-bg-solid);
}

.message-content {
  padding: 16px 20px;
  border-radius: 16px;
  position: relative;
}

.message.assistant .message-content {
  background: var(--ai-msg-bg);
  border: 1px solid var(--ai-msg-border);
  border-top-left-radius: 4px;
  box-shadow: var(--shadow-soft);
}

.message.user .message-content {
  background: var(--user-msg-bg);
  color: var(--user-msg-text);
  border-top-right-radius: 4px;
  box-shadow: var(--shadow-glow-user);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>