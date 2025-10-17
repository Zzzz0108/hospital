import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/config', name: 'config', component: () => import('../views/ConfigView.vue') },
  { path: '/run', name: 'run', component: () => import('../views/RunView.vue') },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
