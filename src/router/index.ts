// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import ListReviews from '@/views/ListReviews.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'reservations',
      component: ListReviews,
    },
  ],
});

export default router;
