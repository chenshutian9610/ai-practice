<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { getModels, type Model } from '../api/models';

const CACHE_KEY = 'web-agent:model-cache';

interface ModelCache {
  models: Model[];
  cachedAt: string;
}

// Props
const props = defineProps<{
  model: string;
}>();

// Emits
const emit = defineEmits<{
  (e: 'update:model', model: string): void;
}>();

// State
const isOpen = ref(false);
const models = ref<Model[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');
const refreshing = ref(false);

// Load cache from localStorage
function loadCache(): ModelCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Failed to load model cache:', e);
  }
  return null;
}

// Save to localStorage
function saveCache(cache: ModelCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to save model cache:', e);
  }
}

// Fetch models from API
async function fetchModels(): Promise<void> {
  try {
    error.value = null;
    const response = await getModels();
    models.value = response.data;

    // Save to cache
    saveCache({
      models: response.data,
      cachedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Failed to fetch models:', e);
    error.value = e instanceof Error ? e.message : 'Failed to fetch models';

    // Keep existing cache on error
    const cache = loadCache();
    if (cache) {
      models.value = cache.models;
    }
  }
}

// Initial load - use cache if available, otherwise fetch
async function loadModels(): Promise<void> {
  const cache = loadCache();
  if (cache && cache.models.length > 0) {
    models.value = cache.models;
    // Silently refresh in background if cache is old
    fetchModels();
  } else {
    loading.value = true;
    await fetchModels();
    loading.value = false;
  }
}

// Refresh models
async function refreshModels(): Promise<void> {
  refreshing.value = true;
  loading.value = true;
  await fetchModels();
  loading.value = false;
  refreshing.value = false;
}

// Filtered models based on search query
const filteredModels = computed(() => {
  if (!searchQuery.value.trim()) {
    return models.value;
  }
  const query = searchQuery.value.toLowerCase();
  return models.value.filter(model =>
    model.id.toLowerCase().includes(query)
  );
});

// Toggle dropdown
function toggleDropdown(): void {
  isOpen.value = !isOpen.value;
  if (isOpen.value && models.value.length === 0) {
    loadModels();
  }
}

// Select model
function selectModel(model: Model): void {
  emit('update:model', model.id);
  isOpen.value = false;
  searchQuery.value = '';
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  if (!target.closest('.model-selector')) {
    isOpen.value = false;
  }
}

// Watch for dropdown open state
watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('click', handleClickOutside);
  } else {
    document.removeEventListener('click', handleClickOutside);
    searchQuery.value = '';
  }
});

// Initialize
loadModels();
</script>

<template>
  <div class="model-selector">
    <button class="model-selector-btn" @click.stop="toggleDropdown">
      <span class="model-name">{{ props.model || 'Select model' }}</span>
      <span class="dropdown-arrow">▼</span>
    </button>

    <div v-if="isOpen" class="model-dropdown">
      <div class="model-search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search models..."
          class="search-input"
        />
        <button
          class="refresh-btn"
          @click.stop="refreshModels"
          :disabled="refreshing"
          title="Refresh models"
        >
          {{ refreshing ? '⟳' : '↻' }}
        </button>
      </div>

      <div v-if="loading && models.length === 0" class="model-loading">
        Loading models...
      </div>

      <div v-else-if="error && models.length === 0" class="model-error">
        {{ error }}
      </div>

      <div v-else-if="filteredModels.length === 0" class="model-empty">
        No models found
      </div>

      <ul v-else class="model-list">
        <li
          v-for="model in filteredModels"
          :key="model.id"
          class="model-item"
          :class="{ active: model.id === props.model }"
          @click="selectModel(model)"
        >
          {{ model.id }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.model-selector {
  position: relative;
  display: inline-block;
}

.model-selector-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary, #333);
}

.model-selector-btn:hover {
  background: var(--bg-hover, #e8e8e8);
}

.model-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  font-size: 10px;
  color: var(--text-muted, #888);
}

.model-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  margin-top: 4px;
  min-width: 250px;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.model-search {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--border-color, #ddd);
}

.search-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.search-input:focus {
  border-color: var(--accent, #007bff);
}

.refresh-btn {
  padding: 6px 10px;
  background: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--bg-hover, #e8e8e8);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.model-loading,
.model-error,
.model-empty {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted, #888);
}

.model-error {
  color: var(--error-color, #dc3545);
}

.model-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 300px;
  overflow-y: auto;
}

.model-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.15s;
}

.model-item:hover {
  background: var(--bg-hover, #e8e8e8);
}

.model-item.active {
  background: var(--accent-light, #e7f3ff);
  color: var(--accent, #007bff);
}
</style>
