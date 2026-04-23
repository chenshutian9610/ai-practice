<script setup lang="ts">
import { ref } from 'vue';
import hljs from 'highlight.js';

const props = defineProps<{
  visible: boolean;
  request: object | null;
  response: object | null;
  toolCallLogs: Array<{
    name: string;
    arguments: any;
    result?: string;
    error?: string;
  }>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const copiedSection = ref<string | null>(null);

async function copyToClipboard(content: string, section: string) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    copiedSection.value = section;
    setTimeout(() => {
      copiedSection.value = null;
    }, 1500);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

function highlightJson(el: HTMLElement) {
  const codeBlocks = el.querySelectorAll('pre code');
  codeBlocks.forEach((block) => {
    hljs.highlightElement(block);
  });
}

function handleOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close');
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-content">
        <div class="modal-header">
          <h2>调试信息</h2>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div class="modal-body">
          <!-- Request Section -->
          <div class="section">
            <div class="section-header">
              <h3>Request</h3>
              <button
                v-if="request"
                class="copy-btn"
                :class="{ copied: copiedSection === 'request' }"
                @click="copyToClipboard(request, 'request')"
              >
                {{ copiedSection === 'request' ? '✓' : '复制' }}
              </button>
            </div>
            <pre v-if="request"><code class="language-json">{{ JSON.stringify(request, null, 2) }}</code></pre>
            <p v-else class="no-data">无数据</p>
          </div>

          <!-- Response Section -->
          <div class="section">
            <div class="section-header">
              <h3>Response</h3>
              <button
                v-if="response"
                class="copy-btn"
                :class="{ copied: copiedSection === 'response' }"
                @click="copyToClipboard(response, 'response')"
              >
                {{ copiedSection === 'response' ? '✓' : '复制' }}
              </button>
            </div>
            <pre v-if="response"><code class="language-json">{{ JSON.stringify(response, null, 2) }}</code></pre>
            <p v-else class="no-data">无数据</p>
          </div>

          <!-- Tool Calls Section -->
          <div class="section">
            <div class="section-header">
              <h3>Tool Calls</h3>
              <button
                v-if="toolCallLogs.length > 0"
                class="copy-btn"
                :class="{ copied: copiedSection === 'tools' }"
                @click="copyToClipboard(toolCallLogs, 'tools')"
              >
                {{ copiedSection === 'tools' ? '✓' : '复制' }}
              </button>
            </div>
            <pre v-if="toolCallLogs.length > 0"><code class="language-json">{{ JSON.stringify(toolCallLogs, null, 2) }}</code></pre>
            <p v-else class="no-data">无工具调用</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px 8px;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.section {
  margin-bottom: 24px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.copy-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-secondary);
}

.copy-btn:hover {
  background: var(--bg-secondary);
}

.copy-btn.copied {
  color: #22c55e;
}

pre {
  background: var(--code-bg);
  padding: 12px 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
}

code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  color: var(--code-text);
}

.no-data {
  color: var(--text-muted);
  font-size: 14px;
  margin: 0;
}
</style>
