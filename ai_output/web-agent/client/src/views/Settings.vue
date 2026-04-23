<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '../stores/settings';
import { storeToRefs } from 'pinia';
import MCPServerList from '../components/MCPServerList.vue';

const router = useRouter();
const settingsStore = useSettingsStore();
const { settings, loading } = storeToRefs(settingsStore);

const localSettings = ref({
  api_endpoint: '',
  api_key: '',
  model: 'gpt-3.5-turbo',
  system_prompt: '',
  theme: 'light',
});

const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

onMounted(async () => {
  await settingsStore.fetchSettings();
  // 同步 store 中的设置到本地，保留 api_key（可能来自 localStorage 或后端）
  localSettings.value = { ...settings.value };
  // 获取 MCP Servers
  await settingsStore.fetchMCPServers();
});

async function saveSettings() {
  await settingsStore.updateSettings(localSettings.value);
  alert('设置已保存');
}

function goBack() {
  router.push('/');
}

function setTheme(theme: string) {
  localSettings.value.theme = theme;
  settingsStore.updateSettings({ theme });
}

function updateSettings(partial: Partial<typeof settings.value>) {
  settingsStore.updateSettings(partial);
}

async function testConnection() {
  if (!localSettings.value.api_endpoint || !localSettings.value.api_key) {
    testResult.value = { success: false, message: '请填写 API Endpoint 和 API Key' };
    return;
  }

  testing.value = true;
  testResult.value = null;

  try {
    const response = await fetch(`${localSettings.value.api_endpoint}/v1/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localSettings.value.api_key}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const modelCount = data.data?.length || 0;
      testResult.value = {
        success: true,
        message: `连接成功！可用模型数量: ${modelCount}`
      };
    } else {
      const error = await response.json();
      testResult.value = {
        success: false,
        message: `连接失败: ${error.error?.message || response.statusText}`
      };
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: `连接失败: ${error instanceof Error ? error.message : '网络错误'}`
    };
  } finally {
    testing.value = false;
  }
}
</script>

<template>
  <div class="settings-page">
    <div class="settings-header">
      <button class="back-btn" @click="goBack">← 返回</button>
      <h2>设置</h2>
    </div>

    <div class="settings-content">
      <div class="settings-group">
        <h3>LLM 配置</h3>

        <div class="form-item">
          <label>API Endpoint</label>
          <input
            v-model="localSettings.api_endpoint"
            type="text"
            placeholder="https://api.openai.com/v1"
          />
          <span class="hint">OpenAI 兼容的 API 地址（不需要 /v1 后缀）</span>
        </div>

        <div class="form-item">
          <label>API Key</label>
          <input
            v-model="localSettings.api_key"
            type="password"
            placeholder="sk-..."
          />
          <span class="hint">用于认证的 API Key</span>
        </div>

        <div class="form-item">
          <label>默认模型</label>
          <input
            v-model="localSettings.model"
            type="text"
            placeholder="gpt-3.5-turbo"
          />
          <span class="hint">新聊天窗口默认使用的模型，可在聊天界面切换</span>
        </div>

        <div class="form-item">
          <button
            class="test-btn"
            @click="testConnection"
            :disabled="testing || !localSettings.api_endpoint || !localSettings.api_key"
          >
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
          <span v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">
            {{ testResult.message }}
          </span>
        </div>
      </div>

      <div class="settings-group">
        <h3>Agent 配置</h3>

        <div class="form-item">
          <label>System Prompt</label>
          <textarea
            v-model="localSettings.system_prompt"
            placeholder="设定 AI 的角色和行为..."
            rows="4"
          ></textarea>
          <span class="hint">定义 AI 助手的角色和行为方式</span>
        </div>
      </div>

      <div class="settings-group">
        <h3>外观</h3>

        <div class="form-item">
          <label>主题</label>
          <div class="theme-toggle">
            <button
              :class="{ active: localSettings.theme === 'light' }"
              @click="setTheme('light')"
            >
              ☀️ 浅色
            </button>
            <button
              :class="{ active: localSettings.theme === 'dark' }"
              @click="setTheme('dark')"
            >
              🌙 深色
            </button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h3>开发者选项</h3>

        <div class="setting-item">
          <div class="setting-label">
            <span>开发者模式</span>
            <span class="setting-description">开启后在 AI 消息旁显示调试按钮</span>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              :checked="settings.developerMode"
              @change="updateSettings({ developerMode: ($event.target as HTMLInputElement).checked })"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-group">
        <MCPServerList />
      </div>

      <div class="settings-actions">
        <button class="save-btn" @click="saveSettings" :disabled="loading">
          {{ loading ? '保存中...' : '保存设置' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.back-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
}

.back-btn:hover {
  background: var(--bg-secondary);
}

.settings-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.settings-group {
  margin-bottom: 32px;
}

.settings-group h3 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.form-item input,
.form-item textarea {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
}

.form-item input:focus,
.form-item textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.form-item textarea {
  resize: vertical;
  font-family: inherit;
}

.form-item .hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
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
  display: block;
  margin-top: 8px;
  font-size: 13px;
  padding: 8px 12px;
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

.theme-toggle {
  display: flex;
  gap: 12px;
}

.theme-toggle button {
  flex: 1;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
}

.theme-toggle button.active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--bg-tertiary);
}

.theme-toggle button:hover:not(.active) {
  background: var(--bg-tertiary);
}

.settings-actions {
  padding-top: 16px;
}

.save-btn {
  width: 100%;
  padding: 12px 24px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.save-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label span:first-child {
  font-size: 14px;
  color: var(--text-primary);
}

.setting-description {
  font-size: 12px;
  color: var(--text-muted);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-tertiary);
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle input:checked + .toggle-slider {
  background: var(--accent);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(24px);
}
</style>