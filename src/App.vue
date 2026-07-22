<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import SideNav from '@/components/SideNav.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'
import { navItems } from '@/components/navItems'

const route = useRoute()

const pageTitle = computed(() => {
  const meta = route.meta?.title
  if (typeof meta === 'string' && meta) return meta
  const found = navItems.find((item) => item.to === route.path)
  return found?.title ?? '轻记'
})

const todayLabel = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
}).format(new Date())
</script>

<template>
  <div class="flex h-full">
    <SideNav />

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="app-header">
        <h1 class="text-xl font-semibold" style="color: var(--color-text-primary)">
          {{ pageTitle }}
        </h1>
        <span class="text-sm" style="color: var(--color-text-secondary)">
          {{ todayLabel }}
        </span>
      </header>

      <main class="app-main">
        <RouterView />
      </main>
    </div>

    <BottomTabBar />
  </div>
</template>
