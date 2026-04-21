import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import * as api from '../api/rest';

export interface MCPServerConfig {
  id: string;
  name: string;
  url?: string;
  command?: string;
  args?: string[];
  enabled: boolean;
  headers?: Record<string, string>;
}

export interface Settings {
  api_endpoint: string;
  api_key: string;
  model: string;
  system_prompt: string;
  theme: string;
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({
    api_endpoint: '',
    api_key: '',
    model: 'gpt-3.5-turbo',
    system_prompt: '',
    theme: 'light',
  });

  const mcpServers = ref<MCPServerConfig[]>([]);
  const loading = ref(false);

  async function fetchSettings() {
    loading.value = true;
    try {
      const data = await api.getSettings();
      // Get stored api_key from localStorage
      const storedApiKey = localStorage.getItem('api_key');
      // Use stored value, otherwise fall back to empty string
      const apiKey = storedApiKey || '';
      settings.value = { ...settings.value, ...data, api_key: apiKey };
      applyTheme(settings.value.theme);
    } finally {
      loading.value = false;
    }
  }

  async function updateSettings(updates: Partial<Settings>) {
    loading.value = true;
    try {
      // Preserve current api_key if not being updated
      const dataToSend = { ...updates };
      if (!updates.api_key && settings.value.api_key) {
        dataToSend.api_key = settings.value.api_key;
      }
      const data = await api.updateSettings(dataToSend);
      // Store api_key in localStorage since backend doesn't return it
      if (dataToSend.api_key) {
        localStorage.setItem('api_key', dataToSend.api_key);
      }
      settings.value = { ...settings.value, ...data, api_key: dataToSend.api_key || settings.value.api_key };
      if (updates.theme) {
        applyTheme(updates.theme);
      }
      return data;
    } finally {
      loading.value = false;
    }
  }

  function applyTheme(theme: string) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function toggleTheme() {
    const newTheme = settings.value.theme === 'light' ? 'dark' : 'light';
    updateSettings({ theme: newTheme });
  }

  async function fetchMCPServers() {
    try {
      mcpServers.value = await api.getMCPServers();
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error);
      mcpServers.value = [];
    }
  }

  async function addMCPServer(server: { name: string; url?: string; command?: string; args?: string[]; enabled?: boolean; headers?: Record<string, string> }) {
    const newServer = await api.addMCPServer(server);
    mcpServers.value.push(newServer);
    return newServer;
  }

  async function updateMCPServer(id: string, updates: { name?: string; url?: string; command?: string; args?: string[]; enabled?: boolean; headers?: Record<string, string> }) {
    const updatedServer = await api.updateMCPServer(id, updates);
    const index = mcpServers.value.findIndex(s => s.id === id);
    if (index !== -1) {
      mcpServers.value[index] = updatedServer;
    }
    return updatedServer;
  }

  async function deleteMCPServer(id: string) {
    await api.deleteMCPServer(id);
    mcpServers.value = mcpServers.value.filter(s => s.id !== id);
  }

  async function testMCPServer(url: string, headers?: Record<string, string>) {
    return api.testMCPServer(url, headers);
  }

  return {
    settings,
    mcpServers,
    loading,
    fetchSettings,
    updateSettings,
    toggleTheme,
    fetchMCPServers,
    addMCPServer,
    updateMCPServer,
    deleteMCPServer,
    testMCPServer,
  };
});