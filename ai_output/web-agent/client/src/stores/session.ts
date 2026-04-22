import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '../api/rest';
import { useSettingsStore } from './settings';

export interface Session {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([]);
  const currentSessionId = ref<string | null>(null);
  const currentModel = ref<string>('gpt-3.5-turbo');
  const loading = ref(false);

  async function fetchSessions() {
    loading.value = true;
    try {
      sessions.value = await api.getSessions();
      // Update current model if a session is selected
      if (currentSessionId.value) {
        const currentSession = sessions.value.find(s => s.id === currentSessionId.value);
        if (currentSession) {
          currentModel.value = currentSession.model;
        }
      }
    } finally {
      loading.value = false;
    }
  }

  async function createSession(title: string = 'New Chat') {
    const settingsStore = useSettingsStore();
    // Ensure settings are loaded before creating session
    await settingsStore.fetchSettings();
    const defaultModel = settingsStore.settings.model;
    const session = await api.createSession(title, defaultModel);
    sessions.value.unshift(session);
    currentSessionId.value = session.id;
    currentModel.value = session.model || defaultModel;
    return session;
  }

  async function deleteSession(id: string) {
    await api.deleteSession(id);
    sessions.value = sessions.value.filter(s => s.id !== id);
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0]?.id || null;
      const newCurrentSession = sessions.value.find(s => s.id === currentSessionId.value);
      currentModel.value = newCurrentSession?.model || sessions.value[0]?.model || 'gpt-3.5-turbo';
    }
  }

  function selectSession(id: string) {
    currentSessionId.value = id;
    const session = sessions.value.find(s => s.id === id);
    currentModel.value = session?.model || 'gpt-3.5-turbo';
  }

  async function updateSessionModel(model: string) {
    if (!currentSessionId.value) return;
    const updated = await api.updateSessionModel(currentSessionId.value, model);
    const index = sessions.value.findIndex(s => s.id === currentSessionId.value);
    if (index !== -1 && updated) {
      sessions.value[index].model = updated.model;
      currentModel.value = updated.model;
    }
  }

  return {
    sessions,
    currentSessionId,
    currentModel,
    loading,
    fetchSessions,
    createSession,
    deleteSession,
    selectSession,
    updateSessionModel,
  };
});