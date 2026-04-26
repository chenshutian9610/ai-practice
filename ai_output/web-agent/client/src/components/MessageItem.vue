<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import hljs from 'highlight.js';
import { useSettingsStore } from '../stores/settings';
import { useChatStore } from '../stores/chat';
import type { DebugInfo } from '../stores/chat';
import DebugModal from './DebugModal.vue';

const props = defineProps<{
  content: string;
  reasoning?: string;
  isStreaming?: boolean;
  messageId?: string;
  isAssistant?: boolean;
}>();

const contentRef = ref<HTMLElement | null>(null);

// Trimmed content
const trimmedContent = computed(() => props.content.trim());

// Parse and render content with code highlighting
const parsedContent = computed(() => {
  const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
  let remaining = trimmedContent.value;

  // Simple regex for code blocks
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(trimmedContent.value)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: remaining.slice(0, match.index - lastIndex),
      });
    }

    parts.push({
      type: 'code',
      content: match[2].trim(),
      language: match[1] || 'plaintext',
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < trimmedContent.value.length) {
    parts.push({
      type: 'text',
      content: trimmedContent.value.slice(lastIndex),
    });
  }

  // If no code blocks, return as single text
  if (parts.length === 0) {
    return [{ type: 'text' as const, content: trimmedContent.value }];
  }

  return parts;
});

// Copy message functionality
const settingsStore = useSettingsStore();
const chatStore = useChatStore();
const copied = ref(false);

async function copyMessage() {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(trimmedContent.value);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = trimmedContent.value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1500);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

// Debug functionality
const showDebugButton = ref(false);
const debugModalVisible = ref(false);
const debugInfo = ref<DebugInfo | null>(null);

function checkDebugData() {
  if (!settingsStore.settings.developerMode || !props.messageId) {
    showDebugButton.value = false;
    return;
  }
  debugInfo.value = chatStore.getDebugInfo(props.messageId);
  showDebugButton.value = debugInfo.value !== null;
}

function openDebugModal() {
  if (props.messageId) {
    debugInfo.value = chatStore.getDebugInfo(props.messageId);
    debugModalVisible.value = true;
  }
}

function closeDebugModal() {
  debugModalVisible.value = false;
}

// Check debug data on mount and when settings change
onMounted(checkDebugData);

// Apply syntax highlighting after render
function highlightCode(el: HTMLElement) {
  const codeBlocks = el.querySelectorAll('pre code');
  codeBlocks.forEach((block) => {
    hljs.highlightElement(block);
  });
}

onMounted(() => {
  if (contentRef.value) {
    highlightCode(contentRef.value);
  }
});

// Code block copy functionality
const codeCopied = ref(false);

async function copyCode(content: string) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(content);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    codeCopied.value = true;
    setTimeout(() => { codeCopied.value = false; }, 1500);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}
</script>

<template>
  <div class="message-item">
    <!-- Thinking process -->
    <div v-if="reasoning" class="reasoning">
      <div class="reasoning-header">
        <svg class="reasoning-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span class="reasoning-label">深度思考</span>
      </div>
      <pre class="reasoning-content">{{ reasoning }}</pre>
    </div>

    <div ref="contentRef" class="content">
      <template v-for="(part, index) in parsedContent" :key="index">
        <template v-if="part.type === 'code'">
          <div class="code-block">
            <div class="code-header">
              <span class="code-language">{{ part.language }}</span>
              <button class="copy-btn" :class="{ copied: codeCopied }" @click="copyCode(part.content)" title="复制代码">
                <svg v-if="!codeCopied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            </div>
            <pre><code :class="`language-${part.language}`">{{ part.content }}</code></pre>
          </div>
        </template>
        <template v-else>
          <p>{{ part.content }}</p>
        </template>
      </template>
    </div>

    <div class="message-actions">
      <button
        v-if="trimmedContent && isAssistant"
        class="action-btn"
        :class="{ copied }"
        @click="copyMessage"
        title="复制"
      >
        <svg v-if="!copied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>

      <button
        v-if="showDebugButton"
        class="action-btn"
        @click="openDebugModal"
        title="调试信息"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      </button>
    </div>

    <DebugModal
      v-if="debugModalVisible"
      :visible="debugModalVisible"
      :request="debugInfo?.request || null"
      :response="debugInfo?.response || null"
      :toolCallLogs="debugInfo?.toolCallLogs || []"
      @close="closeDebugModal"
    />

    <span v-if="isStreaming" class="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </span>
  </div>
</template>

<style scoped>
.message-item {
  position: relative;
  font-family: 'Crimson Pro', 'Georgia', serif;
  font-size: 16px;
  line-height: 1.7;
}

/* Reasoning / Thinking Process */
.reasoning {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border-left: 3px solid var(--accent-ai);
}

.reasoning-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.reasoning-icon {
  color: var(--accent-ai);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.reasoning-label {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent-ai);
}

.reasoning-content {
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

/* Content */
.content {
  line-height: 1.7;
}

.content p {
  margin: 0 0 12px 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.content p:last-child {
  margin-bottom: 0;
}

/* Code Block */
.code-block {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--code-bg);
  border: 1px solid var(--code-border);
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--code-border);
}

.code-language {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.copy-btn.copied {
  color: #22c55e;
}

.code-block pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
}

.code-block code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--code-text);
}

/* Message Actions - always visible, bottom right */
.message-actions {
  position: absolute;
  bottom: -30px;
  right: -10px;
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
  background: var(--bg-secondary);
}

.action-btn.copied {
  color: #22c55e;
  border-color: #22c55e;
}

/* Typing Indicator */
.typing-indicator {
  display: inline-flex;
  gap: 4px;
  margin-left: 8px;
  vertical-align: middle;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: var(--accent-ai);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-6px) scale(1.2);
    opacity: 1;
  }
}

/* Selection */
::selection {
  background: var(--selection-bg);
  color: var(--selection-text);
}
</style>