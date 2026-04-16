import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '../api/rest';

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([]);
  const currentSessionId = ref<string | null>(null);
  const loading = ref(false);

  async function fetchSessions() {
    loading.value = true;
    try {
      sessions.value = await api.getSessions();
    } finally {
      loading.value = false;
    }
  }

  async function createSession(title: string = 'New Chat') {
    const session = await api.createSession(title);
    sessions.value.unshift(session);
    currentSessionId.value = session.id;
    return session;
  }

  async function deleteSession(id: string) {
    await api.deleteSession(id);
    sessions.value = sessions.value.filter(s => s.id !== id);
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0]?.id || null;
    }
  }

  function selectSession(id: string) {
    currentSessionId.value = id;
  }

  return {
    sessions,
    currentSessionId,
    loading,
    fetchSessions,
    createSession,
    deleteSession,
    selectSession,
  };
});