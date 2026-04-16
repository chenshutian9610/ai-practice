<script setup lang="ts">
import { onMounted } from 'vue';
import { useSettingsStore } from './stores/settings';

const settingsStore = useSettingsStore();

onMounted(async () => {
  await settingsStore.fetchSettings();
});
</script>

<template>
  <RouterView />
</template>

<style>
/* Import highlight.js theme */
@import 'highlight.js/styles/github.css';

/* Global styles */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

#app {
  height: 100%;
}
</style>