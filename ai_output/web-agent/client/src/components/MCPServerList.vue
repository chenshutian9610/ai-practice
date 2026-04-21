<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore, type MCPServerConfig } from '../stores/settings';
import MCPServerForm from './MCPServerForm.vue';

const settingsStore = useSettingsStore();

const showForm = ref(false);
const editingServer = ref<MCPServerConfig | null>(null);
const testingServerId = ref<string | null>(null);
const testResult = ref<{ success: boolean; message: string } | null>(null);

function openAddForm() {
  editingServer.value = null;
  showForm.value = true;
}

function openEditForm(server: MCPServerConfig) {
  editingServer.value = { ...server };
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingServer.value = null;
}

async function handleServerSaved() {
  closeForm();
  await settingsStore.fetchMCPServers();
}

async function handleDelete(server: MCPServerConfig) {
  if (confirm(`确定要删除 MCP Server "${server.name}" 吗？`)) {
    await settingsStore.deleteMCPServer(server.id);
  }
}

async function handleToggle(server: MCPServerConfig) {
  await settingsStore.updateMCPServer(server.id, { enabled: !server.enabled });
}

async function handleTest(server: MCPServerConfig) {
  testingServerId.value = server.id;
  testResult.value = null;

  try {
    const result = await settingsStore.testMCPServer(server.url, server.headers);
    testResult.value = result;
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : '测试失败'
    };
  } finally {
    testingServerId.value = null;
  }
}
</script>

<template>
  <div class="mcp-server-list">
    <div class="mcp-header">
      <h3>MCP Servers</h3>
      <button class="add-btn" @click="openAddForm">+ 添加 Server</button>
    </div>

    <div v-if="settingsStore.mcpServers.length === 0" class="empty-state">
      <p>暂无配置的 MCP Server</p>
      <p class="hint">添加 MCP Server 以启用工具调用功能</p>
    </div>

    <div v-else class="server-list">
      <div
        v-for="server in settingsStore.mcpServers"
        :key="server.id"
        class="server-item"
        :class="{ disabled: !server.enabled }"
      >
        <div class="server-info">
          <div class="server-name">
            {{ server.name }}
            <span v-if="!server.enabled" class="badge">已禁用</span>
          </div>
          <div class="server-url">{{ server.url }}</div>
        </div>

        <div class="server-actions">
          <label class="toggle">
            <input
              type="checkbox"
              :checked="server.enabled"
              @change="handleToggle(server)"
            />
            <span>启用</span>
          </label>

          <button
            class="action-btn test-btn"
            @click="handleTest(server)"
            :disabled="testingServerId === server.id"
          >
            {{ testingServerId === server.id ? '测试中...' : '测试' }}
          </button>

          <button class="action-btn edit-btn" @click="openEditForm(server)">
            编辑
          </button>

          <button class="action-btn delete-btn" @click="handleDelete(server)">
            删除
          </button>
        </div>

        <div v-if="testResult && testingServerId === null" class="test-result" :class="testResult.success ? 'success' : 'error'">
          {{ testResult.message }}
        </div>
      </div>
    </div>

    <MCPServerForm
      v-if="showForm"
      :server="editingServer"
      @close="closeForm"
      @saved="handleServerSaved"
    />
  </div>
</template>

<style scoped>
.mcp-server-list {
  margin-top: 24px;
}

.mcp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.mcp-header h3 {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-btn {
  padding: 8px 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.add-btn:hover {
  background: var(--accent-hover);
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--text-secondary);
}

.empty-state .hint {
  font-size: 12px;
  margin-top: 8px;
}

.server-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.server-item {
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.server-item.disabled {
  opacity: 0.6;
}

.server-info {
  margin-bottom: 12px;
}

.server-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.server-name .badge {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  font-weight: normal;
}

.server-url {
  font-size: 13px;
  color: var(--text-muted);
  word-break: break-all;
}

.server-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
}

.toggle input {
  cursor: pointer;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
}

.action-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.edit-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.delete-btn:hover:not(:disabled) {
  border-color: #ef4444;
  color: #ef4444;
}

.test-result {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.test-result.success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.test-result.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
</style>
