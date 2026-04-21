<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore, type MCPServerConfig } from '../stores/settings';

const props = defineProps<{
  server?: MCPServerConfig | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const settingsStore = useSettingsStore();

const transportType = ref<'http' | 'stdio'>('http');
const form = ref({
  name: '',
  url: '',
  command: 'python',
  args: '-m mcp_server_time',
  enabled: true,
});

const saving = ref(false);
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);
const error = ref<string | null>(null);

onMounted(() => {
  if (props.server) {
    form.value = {
      name: props.server.name,
      url: props.server.url || '',
      command: props.server.command || 'python',
      args: props.server.args?.join(' ') || '-m mcp_server_time',
      enabled: props.server.enabled,
    };
    if (props.server.command) {
      transportType.value = 'stdio';
    }
  }
});

async function handleSubmit() {
  error.value = null;

  if (!form.value.name.trim()) {
    error.value = '请输入服务器名称';
    return;
  }

  if (transportType.value === 'http' && !form.value.url.trim()) {
    error.value = '请输入服务器 URL';
    return;
  }

  if (transportType.value === 'stdio' && (!form.value.command.trim() || !form.value.args.trim())) {
    error.value = '请输入命令和参数';
    return;
  }

  saving.value = true;

  try {
    const serverData: any = {
      name: form.value.name,
      enabled: form.value.enabled,
    };

    if (transportType.value === 'http') {
      serverData.url = form.value.url;
    } else {
      serverData.command = form.value.command;
      serverData.args = form.value.args.split(' ').filter(s => s.trim());
    }

    if (props.server) {
      await settingsStore.updateMCPServer(props.server.id, serverData);
    } else {
      await settingsStore.addMCPServer(serverData);
    }
    emit('saved');
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败';
  } finally {
    saving.value = false;
  }
}

async function handleTest() {
  if (transportType.value === 'http' && !form.value.url.trim()) {
    testResult.value = { success: false, message: '请先输入服务器 URL' };
    return;
  }

  testing.value = true;
  testResult.value = null;

  try {
    // For stdio servers, we can't test via HTTP, so just show a message
    if (transportType.value === 'stdio') {
      testResult.value = { success: true, message: 'Stdio 服务器将在聊天时自动连接' };
    } else {
      const result = await settingsStore.testMCPServer(form.value.url);
      testResult.value = result;
    }
  } catch (err) {
    testResult.value = {
      success: false,
      message: err instanceof Error ? err.message : '测试失败'
    };
  } finally {
    testing.value = false;
  }
}

function handleClose() {
  emit('close');
}
</script>

<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ server ? '编辑 MCP Server' : '添加 MCP Server' }}</h3>
        <button class="close-btn" @click="handleClose">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-item">
          <label>名称</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="例如: Time Server"
          />
        </div>

        <div class="form-item">
          <label>传输方式</label>
          <div class="transport-toggle">
            <button
              type="button"
              :class="{ active: transportType === 'http' }"
              @click="transportType = 'http'"
            >
              HTTP
            </button>
            <button
              type="button"
              :class="{ active: transportType === 'stdio' }"
              @click="transportType = 'stdio'"
            >
              Stdio (命令行)
            </button>
          </div>
        </div>

        <div v-if="transportType === 'http'" class="form-item">
          <label>URL</label>
          <input
            v-model="form.url"
            type="text"
            placeholder="http://localhost:3000"
          />
          <span class="hint">MCP Server 的 HTTP 地址</span>
        </div>

        <template v-else>
          <div class="form-item">
            <label>命令</label>
            <input
              v-model="form.command"
              type="text"
              placeholder="python"
            />
            <span class="hint">运行 MCP Server 的命令</span>
          </div>

          <div class="form-item">
            <label>参数</label>
            <input
              v-model="form.args"
              type="text"
              placeholder="-m mcp_server_time"
            />
            <span class="hint">命令参数，用空格分隔</span>
          </div>
        </template>

        <div class="form-item">
          <label class="checkbox-label">
            <input v-model="form.enabled" type="checkbox" />
            <span>启用此 Server</span>
          </label>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <div class="test-section">
          <button
            type="button"
            class="test-btn"
            @click="handleTest"
            :disabled="testing"
          >
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
          <span v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
            {{ testResult.message }}
          </span>
        </div>

        <div class="modal-actions">
          <button type="button" class="cancel-btn" @click="handleClose">
            取消
          </button>
          <button type="submit" class="save-btn" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </form>
    </div>
  </div>
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
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-primary);
}

form {
  padding: 20px;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--text-primary);
}

.form-item input[type="text"] {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
}

.form-item input[type="text"]:focus {
  outline: none;
  border-color: var(--accent);
}

.form-item .hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.transport-toggle {
  display: flex;
  gap: 8px;
}

.transport-toggle button {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
}

.transport-toggle button.active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--bg-tertiary);
}

.transport-toggle button:hover:not(.active) {
  background: var(--bg-tertiary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  cursor: pointer;
}

.error-message {
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
}

.test-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.test-btn {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
}

.test-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-result {
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 4px;
}

.test-result.success {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.test-result.error {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.cancel-btn {
  padding: 10px 20px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: var(--bg-secondary);
}

.save-btn {
  padding: 10px 20px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.save-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
