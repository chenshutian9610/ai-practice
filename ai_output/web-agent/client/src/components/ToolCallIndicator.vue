<script setup lang="ts">
import { ref, watch } from 'vue';

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

// Auto-hide after a few seconds
watch(() => props.toolCalls.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    visible.value = true;
  }
});
</script>

<template>
  <div v-if="toolCalls.length > 0" class="tool-call-indicator">
    <div class="indicator-header">
      <span class="indicator-title">Tool Calls</span>
    </div>
    <div class="tool-list">
      <div
        v-for="(call, index) in toolCalls"
        :key="index"
        class="tool-item"
        :class="call.status"
      >
        <div class="tool-header">
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
        <div v-if="call.status === 'error' && call.error" class="tool-error">
          {{ call.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-call-indicator {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.indicator-header {
  margin-bottom: 8px;
}

.indicator-title {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-item {
  background: var(--bg-tertiary);
  border-radius: 6px;
  padding: 10px 12px;
}

.tool-item.calling {
  border-left: 3px solid var(--accent);
}

.tool-item.success {
  border-left: 3px solid #22c55e;
}

.tool-item.error {
  border-left: 3px solid #ef4444;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-icon {
  font-size: 14px;
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
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.tool-status {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: auto;
}

.tool-error {
  margin-top: 8px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
  font-size: 13px;
  color: #ef4444;
}
</style>
