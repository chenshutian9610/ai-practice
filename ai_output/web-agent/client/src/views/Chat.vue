<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { useSettingsStore } from '../stores/settings';
import SessionList from '../components/SessionList.vue';
import ChatWindow from '../components/ChatWindow.vue';

const router = useRouter();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();

function goToSettings() {
  router.push('/settings');
}

onMounted(() => {
  settingsStore.fetchSettings();
  sessionStore.fetchSessions();
});
</script>

<template>
  <div class="app-layout">
    <SessionList />
    <ChatWindow />
    <div class="top-bar">
      <button class="settings-btn" @click="goToSettings" title="设置">
        ⚙️
      </button>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  position: relative;
}

.top-bar {
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 100;
}

.settings-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-btn:hover {
  background: var(--bg-tertiary);
}
</style>