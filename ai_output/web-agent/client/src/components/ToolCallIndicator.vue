<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

export interface ToolCallStatus {
  tool: string;
  status: 'calling' | 'success' | 'error';
  result?: string;
  error?: string;
}

const props = defineProps<{
  toolCalls: ToolCallStatus[];
}>();

const visible = ref(true);
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

function startHideTimer() {
  if (hideTimeout) clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    visible.value = false;
  }, 3000);
}

watch(() => props.toolCalls.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    visible.value = true;
    startHideTimer();
  }
});

onMounted(() => {
  startHideTimer();
});

onUnmounted(() => {
  if (hideTimeout) clearTimeout(hideTimeout);
});
</script>

<template>
  <Transition name="fade">
    <div v-if="visible && toolCalls.length > 0" class="tool-call-toast">
      <div class="toast-header">
        <span class="toast-title">Tool Calls</span>
        <span class="toast-count">{{ toolCalls.length }}</span>
      </div>
      <div class="tool-list">
        <div
          v-for="(call, index) in toolCalls"
          :key="index"
          class="tool-item"
          :class="call.status"
        >
          <span class="tool-icon">
            <template v-if="call.status === 'calling'">
              <span class="spinner">⟳</span>
            </template>
            <template v-else-if="call.status === 'success'">
              <span class="checkmark">✓</span>
            </template>
            <template v-else>
              <span class="error-icon">✕</span>
            </template>
          </span>
          <span class="tool-name">{{ call.tool }}</span>
          <span class="tool-status">
            <template v-if="call.status === 'calling'">调用中...</template>
            <template v-else-if="call.status === 'success'">完成</template>
            <template v-else>失败</template>
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.tool-call-toast {
  position: fixed;
  bottom: 100px;
  right: 24px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 16px;
  min-width: 240px;
  max-width: 320px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 100;
}

.toast-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.toast-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toast-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent-ai);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 10px;
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  border-left: 3px solid var(--accent-ai);
}

.tool-item.success {
  border-left-color: #22c55e;
}

.tool-item.error {
  border-left-color: #ef4444;
}

.tool-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}

.tool-item.calling .tool-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.checkmark {
  color: #22c55e;
}

.error-icon {
  color: #ef4444;
}

.tool-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}

.tool-status {
  font-size: 11px;
  color: var(--text-muted);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
