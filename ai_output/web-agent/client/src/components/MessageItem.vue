<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import hljs from 'highlight.js';
import { useSettingsStore } from '../stores/settings';
import { useChatStore } from '../stores/chat';
import DebugModal from './DebugModal.vue';

const props = defineProps<{
  content: string;
  reasoning?: string;
  isStreaming?: boolean;
  messageId?: string;
}>();

const contentRef = ref<HTMLElement | null>(null);

// Parse and render content with code highlighting
const parsedContent = computed(() => {
  const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
  let remaining = props.content;

  // Simple regex for code blocks
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(props.content)) !== null) {
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
  if (lastIndex < props.content.length) {
    parts.push({
      type: 'text',
      content: props.content.slice(lastIndex),
    });
  }

  // If no code blocks, return as single text
  if (parts.length === 0) {
    return [{ type: 'text' as const, content: props.content }];
  }

  return parts;
});

// Copy functionality
const copied = ref(false);

async function copyContent() {
  try {
    const text = props.content;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for environments where clipboard API is not available
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

// Debug functionality
const settingsStore = useSettingsStore();
const showDebugButton = ref(false);
const debugModalVisible = ref(false);
const debugInfo = ref<any>(null);

function checkDebugData() {
  if (!settingsStore.settings.developerMode || !props.messageId) {
    showDebugButton.value = false;
    return;
  }
  const chatStore = useChatStore();
  debugInfo.value = chatStore.getDebugInfo(props.messageId);
  showDebugButton.value = debugInfo.value !== null;
}

function openDebugModal() {
  debugInfo.value = props.messageId ? useChatStore().getDebugInfo(props.messageId) : null;
  debugModalVisible.value = true;
}

function closeDebugModal() {
  debugModalVisible.value = false;
}

// Watch for changes
watch(() => props.messageId, checkDebugData, { immediate: true });
watch(() => settingsStore.settings.developerMode, checkDebugData);

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
</script>

<template>
  <div class="message-item">
    <!-- Thinking process -->
    <div v-if="reasoning" class="reasoning">
      <span class="reasoning-label">思考中...</span>
      <pre class="reasoning-content">{{ reasoning }}</pre>
    </div>

    <div ref="contentRef" class="content">
      <template v-for="(part, index) in parsedContent" :key="index">
        <template v-if="part.type === 'code'">
          <div class="code-block">
            <button class="copy-btn" :class="{ copied }" @click="copyContent" title="复制">
              {{ copied ? '✓' : '📋' }}
            </button>
            <pre><code :class="`language-${part.language}`">{{ part.content }}</code></pre>
          </div>
        </template>
        <template v-else>
          <p>{{ part.content }}</p>
        </template>
      </template>
    </div>

    <button
      v-if="content"
      class="copy-float-btn"
      :class="{ copied }"
      @click="copyContent"
      title="复制"
    >
      {{ copied ? '✓' : '📋' }}
    </button>

    <button
      v-if="showDebugButton"
      class="debug-btn"
      @click="openDebugModal"
      title="调试信息"
    >
      🔍
    </button>

    <DebugModal
      v-if="debugModalVisible"
      :visible="debugModalVisible"
      :request="debugInfo?.request || null"
      :response="debugInfo?.response || null"
      :toolCallLogs="debugInfo?.toolCallLogs || []"
      @close="closeDebugModal"
    />

    <span v-if="isStreaming" class="typing-indicator">
      <span></span><span></span><span></span>
    </span>
  </div>
</template>

<style scoped>
.message-item {
  position: relative;
}

.reasoning {
  margin-bottom: 0;
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  border-left: 3px solid var(--accent);
}

.reasoning-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
  display: block;
}

.reasoning-content {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'Fira Code', 'Consolas', monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.content {
  line-height: 1.4;
  margin-top: -4px;
}

.content p {
  margin: 0 0 2px 0;
  white-space: pre-wrap;
  line-height: 1.4;
}

.code-block {
  position: relative;
  margin: 8px 0;
}

.code-block pre {
  background: var(--code-bg);
  padding: 12px 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
}

.code-block code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  color: var(--code-text);
}

.copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  opacity: 0.7;
  font-size: 12px;
}

.copy-btn:hover {
  opacity: 1;
}

.copy-btn.copied,
.copy-float-btn.copied {
  color: #22c55e;
  opacity: 1;
}

.copy-float-btn {
  position: absolute;
  top: -4px;
  right: -24px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.3;
  font-size: 12px;
  padding: 4px 6px;
}

.message-item:hover .copy-float-btn {
  opacity: 0.7;
}

.copy-float-btn:hover {
  opacity: 1 !important;
}

.debug-btn {
  position: absolute;
  top: -4px;
  right: -48px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.3;
  font-size: 12px;
  padding: 4px 6px;
}

.message-item:hover .debug-btn {
  opacity: 0.7;
}

.debug-btn:hover {
  opacity: 1 !important;
}

.typing-indicator {
  display: inline-flex;
  gap: 3px;
  margin-left: 4px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: var(--text-muted);
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
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}
</style>