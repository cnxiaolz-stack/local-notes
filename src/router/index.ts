import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/today' },
  {
    path: '/today',
    name: 'today',
    component: () => import('@/views/TodayView.vue'),
    meta: { title: '今日' }
  },
  {
    path: '/notes',
    name: 'notes',
    component: () => import('@/views/NotesView.vue'),
    meta: { title: '便签' }
  },
  {
    path: '/diary',
    name: 'diary',
    component: () => import('@/views/DiaryView.vue'),
    meta: { title: '日记' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: '设置' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
