# 开发者模式实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加开发者模式功能，允许用户查看 AI 接口的请求参数、响应结果和工具调用日志

**Architecture:** 在设置页面添加开发者模式开关，在 chat store 中存储调试数据，新增 DebugModal 组件用于显示调试信息

**Tech Stack:** Vue 3 + Pinia + TypeScript

---

## 文件结构

```
client/src/
├── stores/
│   ├── chat.ts          # 扩展：添加 debugInfo 和 developerMode
│   └── settings.ts      # 扩展：添加 developerMode 设置项
├── components/
│   ├── DebugModal.vue   # 新增：调试信息模态框
│   └── MessageItem.vue  # 修改：添加调试按钮
└── views/
    └── Settings.vue     # 修改：添加开发者模式开关

server/src/
├── routes/
│   └── chat.ts          # 修改：返回完整请求参数
└── services/
    └── llm.ts           # 修改：暴露完整请求数据
```

---

## Task 1: 扩展 Settings Store

**Files:**
- Modify: `client/src/stores/settings.ts:15-30`

- [ ] **Step 1: 在 Settings 接口中添加 developerMode 字段**

```typescript
export interface Settings {
  api_endpoint: string;
  api_key: string;
  model: string;
  system_prompt: string;
  theme: string;
  developerMode: boolean;  // 新增
}
```

- [ ] **Step 2: 在 settings 默认值中添加 developerMode: false**

```typescript
const settings = ref<Settings>({
  api_endpoint: '',
  api_key: '',
  model: 'gpt-3.5-turbo',
  system_prompt: '',
  theme: 'light',
  developerMode: false,  // 新增
});
```

- [ ] **Step 3: 验证修改**

检查 settings store 是否正确包含 developerMode 字段

---

## Task 2: 创建 DebugModal 组件

**Files:**
- Create: `client/src/components/DebugModal.vue`

- [ ] **Step 1: 创建 DebugModal.vue 文件**

```vue
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
```

- [ ] **Step 2: 验证文件创建成功**

检查 `client/src/components/DebugModal.vue` 文件是否存在且内容正确

---

## Task 3: 扩展 Chat Store

**Files:**
- Modify: `client/src/stores/chat.ts:1-202`

- [ ] **Step 1: 添加 DebugInfo 类型定义**

```typescript
export interface ToolCallLog {
  name: string;
  arguments: any;
  result?: string;
  error?: string;
}

export interface DebugInfo {
  messageId: string;
  request: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: Array<{ name: string; description?: string }>;
  };
  response: {
    content: string;
    reasoning?: string;
    toolCalls?: Array<{
      id: string;
      name: string;
      arguments: any;
    }>;
  };
  toolCallLogs: ToolCallLog[];
}
```

- [ ] **Step 2: 添加 debugInfo ref 和当前调试数据**

```typescript
const debugInfo = ref<Record<string, DebugInfo>>({});
let currentDebugInfo: DebugInfo | null = null;
```

- [ ] **Step 3: 添加辅助函数**

```typescript
function startDebugInfo(messageId: string, request: DebugInfo['request']) {
  currentDebugInfo = {
    messageId,
    request,
    response: { content: '', reasoning: '' },
    toolCallLogs: [],
  };
}

function updateDebugResponse(response: Partial<DebugInfo['response']>) {
  if (currentDebugInfo) {
    currentDebugInfo.response = { ...currentDebugInfo.response, ...response };
  }
}

function addToolCallLog(log: ToolCallLog) {
  if (currentDebugInfo) {
    currentDebugInfo.toolCallLogs.push(log);
  }
}

function finalizeDebugInfo() {
  if (currentDebugInfo) {
    debugInfo.value[currentDebugInfo.messageId] = currentDebugInfo;
    currentDebugInfo = null;
  }
}

function getDebugInfo(messageId: string): DebugInfo | null {
  return debugInfo.value[messageId] || null;
}
```

- [ ] **Step 4: 在 sendMessageWithStream 中集成调试逻辑**

在函数开头初始化调试信息：
```typescript
// 构建请求参数用于调试
const debugRequest = {
  model: session.model || settings.model,
  messages: [
    ...messages, // 需要构建完整消息列表
  ],
  tools: llmTools,
};
startDebugInfo(aiMessageId, debugRequest);
```

在 onChunk 回调中更新响应：
```typescript
onChunk = (content, reasoning) => {
  fullContent += content;
  fullReasoning += reasoning;
  updateDebugResponse({ content: fullContent, reasoning: fullReasoning });
};
```

在 onToolEvent 中记录工具调用：
```typescript
onToolEvent = (event) => {
  if (event.type === 'tool_call') {
    addToolCallLog({ name: event.tool, arguments: event.input });
  } else if (event.type === 'tool_result') {
    // 更新最后一条 tool call log
    if (currentDebugInfo && currentDebugInfo.toolCallLogs.length > 0) {
      const lastLog = currentDebugInfo.toolCallLogs[currentDebugInfo.toolCallLogs.length - 1];
      lastLog.result = event.result;
    }
  } else if (event.type === 'tool_error') {
    if (currentDebugInfo && currentDebugInfo.toolCallLogs.length > 0) {
      const lastLog = currentDebugInfo.toolCallLogs[currentDebugInfo.toolCallLogs.length - 1];
      lastLog.error = event.error;
    }
  }
};
```

在 finally 中保存调试信息：
```typescript
} finally {
  finalizeDebugInfo();  // 添加这行
  streaming.value = false;
  abortController = null;
}
```

- [ ] **Step 5: 在 return 中导出新函数**

```typescript
return {
  // ... existing exports
  debugInfo,
  getDebugInfo,
};
```

---

## Task 4: 修改 MessageItem 组件

**Files:**
- Modify: `client/src/components/MessageItem.vue:1-275`

- [ ] **Step 1: 添加 props**

```typescript
const props = defineProps<{
  content: string;
  reasoning?: string;
  isStreaming?: boolean;
  messageId?: string;  // 新增
}>();
```

- [ ] **Step 2: 注入 settings store 并添加调试相关状态**

```typescript
import { useSettingsStore } from '../stores/settings';

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
```

- [ ] **Step 3: 添加调试按钮和模态框**

在复制按钮后面添加：
```vue
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
```

- [ ] **Step 4: 添加调试按钮样式**

```css
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
```

- [ ] **Step 5: 添加 DebugModal 导入**

```typescript
import DebugModal from './DebugModal.vue';
```

---

## Task 5: 修改 Settings.vue 添加开发者模式开关

**Files:**
- Modify: `client/src/views/Settings.vue`

- [ ] **Step 1: 找到合适位置添加开发者模式开关**

在现有设置项后面添加：
```vue
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
```

- [ ] **Step 2: 添加 toggle 样式**

```css
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
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
```

---

## Task 6: 后端修改 - 返回完整请求参数

**Files:**
- Modify: `server/src/routes/chat.ts:187-434`

- [ ] **Step 1: 在流式响应结束时发送调试信息**

在 `chat.ts` 的流式路由中，找到 `res.write('data: [DONE]\n\n');` 之前，添加：

```typescript
// 发送调试信息
res.write(`data: ${JSON.stringify({
  type: 'debug_info',
  request: {
    model: finalModel,
    messages: messages.slice(0, -1), // 不包含最后一次用户消息
    tools: llmTools,
  },
})}\n\n`);
```

注意：需要调整 messages 构建位置，确保在循环结束后仍有完整上下文。

---

## Task 7: 前端处理调试信息

**Files:**
- Modify: `client/src/api/rest.ts:63-134`

- [ ] **Step 1: 在 sendMessageStream 中处理 debug_info 类型**

在 `sendMessageStream` 函数的 `for (const line of lines)` 循环中添加：

```typescript
// 调试信息
if (parsed.type === 'debug_info') {
  // 通过回调传递给 store
  if (onToolEvent) {
    onToolEvent({
      type: 'debug_info' as any,
      request: parsed.request,
    });
  }
  continue;
}
```

- [ ] **Step 2: 添加新的 ToolCallEvent 类型**

```typescript
export interface ToolCallEvent {
  type: 'tool_call' | 'tool_result' | 'tool_error' | 'debug_info';
  tool?: string;
  toolCallId?: string;
  input?: Record<string, unknown>;
  result?: string;
  error?: string;
  request?: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: any[];
  };
}
```

---

## Task 8: 集成测试

**Files:**
- 无

- [ ] **Step 1: 启动前后端服务**

```bash
# Terminal 1: 启动后端
cd /home/triski/Documents/gitrepo/ai-practice/ai_output/web-agent/server
npm run dev

# Terminal 2: 启动前端
cd /home/triski/Documents/gitrepo/ai-practice/ai_output/web-agent/client
npm run dev
```

- [ ] **Step 2: 测试开发者模式开关**

1. 打开设置页面
2. 开启开发者模式
3. 刷新页面，检查设置是否保持

- [ ] **Step 3: 测试调试按钮显示**

1. 发送一条消息
2. 等待 AI 回复完成
3. 检查消息旁边是否显示调试按钮

- [ ] **Step 4: 测试调试弹窗**

1. 点击调试按钮
2. 检查 Modal 是否正确显示 Request / Response / Tool Calls
3. 测试复制功能
4. 关闭 Modal

- [ ] **Step 5: 测试历史记录**

1. 刷新页面
2. 检查历史消息是否没有调试按钮（因为数据在内存中）

---

## 自检清单

- [ ] Spec 覆盖：所有功能点都有对应 Task
- [ ] 无占位符：所有步骤都有完整代码
- [ ] 类型一致性：DebugInfo、ToolCallLog 等类型在各文件中保持一致
- [ ] 文件路径：所有路径都是绝对路径
