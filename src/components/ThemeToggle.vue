<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import AppIcon from '@/components/AppIcon.vue'

const app = useAppStore()

const order = ['light', 'dark', 'system'] as const

function iconFor(mode: 'light' | 'dark' | 'system'): string {
  return mode === 'light' ? 'sun' : mode === 'dark' ? 'moon' : 'monitor'
}

function labelFor(mode: 'light' | 'dark' | 'system'): string {
  return mode === 'light' ? '浅色' : mode === 'dark' ? '深色' : '跟随系统'
}

function cycle(): void {
  const idx = order.indexOf(app.theme)
  app.setTheme(order[(idx + 1) % order.length])
}
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :title="`主题：${labelFor(app.theme)}（点击切换）`"
    @click="cycle"
  >
    <AppIcon :name="iconFor(app.theme)" />
    <span>{{ labelFor(app.theme) }}</span>
  </button>
</template>
