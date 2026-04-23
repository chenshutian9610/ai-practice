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
      <div class="empty-icon">💬</div>
      <p>开始一个新对话吧</p>
    </div>

    <div v-else class="messages">
      <div
        v-for="message in messages"
        :key="message.id"
        class="message"
        :class="message.role"
      >
        <div class="message-avatar">
          {{ message.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="message-content">
          <MessageItem :content="message.content" :reasoning="message.reasoning" :isStreaming="streaming && message === messages[messages.length - 1]" :messageId="message.id" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 14px;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.message-content {
  padding: 16px 16px 12px 16px;
  border-radius: 12px;
  word-wrap: break-word;
}

.message.user .message-content {
  background: var(--user-msg-bg);
  color: var(--user-msg-text);
}

.message.assistant .message-content {
  background: var(--ai-msg-bg);
  color: var(--ai-msg-text);
}
</style>