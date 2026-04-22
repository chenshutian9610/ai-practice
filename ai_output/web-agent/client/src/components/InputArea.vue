<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  disabled?: boolean;
  streaming?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', content: string): void;
  (e: 'file', file: File): void;
  (e: 'stop'): void;
}>();

const inputText = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploadedFile = ref<File | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function autoResize() {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
    const newHeight = Math.min(textareaRef.value.scrollHeight, 224);
    textareaRef.value.style.height = newHeight + 'px';
  }
}

const canSubmit = computed(() => {
  return (inputText.value.trim() || uploadedFile.value) && !props.disabled;
});

async function handleSubmit() {
  if (!canSubmit.value) return;

  const content = inputText.value.trim();

  emit('submit', content);
  inputText.value = '';
  uploadedFile.value = null;
  // Reset textarea height after sending
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
  }
}

function handleKeyDown(e: KeyboardEvent) {
  // Send with Enter (or Ctrl+Enter as alternative)
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
}

function triggerFileUpload() {
  fileInputRef.value?.click();
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    uploadedFile.value = file;
    // For MVP, we just show the filename - actual file handling can be expanded later
  }
}

function removeFile() {
  uploadedFile.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}
</script>

<template>
  <div class="input-area">
    <div class="input-container">
      <!-- File preview -->
      <div v-if="uploadedFile" class="file-preview">
        <span class="file-name">📎 {{ uploadedFile.name }}</span>
        <button class="remove-file" @click="removeFile">×</button>
      </div>

      <textarea
        ref="textareaRef"
        v-model="inputText"
        @keydown="handleKeyDown"
        @input="autoResize"
        :placeholder="streaming ? '停止输出，双击 Esc' : '输入消息，按 Enter 发送，Shift+Enter 换行'"
        rows="1"
        :disabled="disabled"
      ></textarea>

      <div class="input-actions">
        <input
          ref="fileInputRef"
          type="file"
          @change="handleFileChange"
          style="display: none"
        />
        <button class="action-btn" @click="triggerFileUpload" title="上传文件">
          📎
        </button>
        <button
          class="send-btn"
          @click="streaming ? emit('stop') : handleSubmit"
          :disabled="!streaming && !canSubmit"
        >
          {{ streaming ? '⏹ 停止' : (disabled ? '发送中...' : '发送') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-area {
  padding: 16px 20px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border);
}

.input-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 13px;
}

.file-name {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-file {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
}

.remove-file:hover {
  color: #ff4444;
}

textarea {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  min-height: 45px;
  max-height: 224px;
  line-height: 1.6;
}

textarea::placeholder {
  color: var(--text-muted);
}

textarea:disabled {
  opacity: 0.6;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.send-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  color: var(--text-muted);
}

.action-btn:hover {
  color: var(--text-primary);
}

.send-btn {
  padding: 8px 20px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  min-width: 80px;
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>