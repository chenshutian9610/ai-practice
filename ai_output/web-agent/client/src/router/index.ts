import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'chat',
    component: () => import('../views/Chat.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/Settings.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;