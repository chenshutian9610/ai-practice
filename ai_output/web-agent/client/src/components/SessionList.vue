<script setup lang="ts">
import { useSessionStore } from '../stores/session';
import { storeToRefs } from 'pinia';

const sessionStore = useSessionStore();
const { sessions, currentSessionId, loading } = storeToRefs(sessionStore);

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}
</script>

<template>
  <div class="session-list">
    <div class="session-header">
      <h3>会话</h3>
      <button class="new-btn" @click="sessionStore.createSession()" :disabled="loading">
        + 新建
      </button>
    </div>

    <div class="sessions">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: session.id === currentSessionId }"
        @click="sessionStore.selectSession(session.id)"
      >
        <div class="session-info">
          <span class="session-title">{{ session.title }}</span>
          <span class="session-date">{{ formatDate(session.updated_at) }}</span>
        </div>
        <button
          class="delete-btn"
          @click.stop="sessionStore.deleteSession(session.id)"
          title="删除会话"
        >
          ×
        </button>
      </div>

      <div v-if="sessions.length === 0" class="empty">
        暂无会话，点击"新建"开始
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-list {
  width: 260px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.session-header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-header h3 {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.new-btn {
  padding: 6px 12px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.new-btn:hover {
  background: var(--accent-hover);
}

.new-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sessions {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
}

.session-item:hover {
  background: var(--bg-tertiary);
}

.session-item.active {
  background: var(--bg-tertiary);
  border-left: 3px solid var(--accent);
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.session-title {
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-date {
  font-size: 11px;
  color: var(--text-muted);
}

.delete-btn {
  opacity: 0;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #ff4444;
}

.empty {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 13px;
}
</style>