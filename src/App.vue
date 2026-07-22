<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import SideNav from '@/components/SideNav.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'
import DatePickerButton from '@/components/common/DatePickerButton.vue'
import { navItems } from '@/components/navItems'

const route = useRoute()

const pageTitle = computed(() => {
  const meta = route.meta?.title
  if (typeof meta === 'string' && meta) return meta
  const found = navItems.find((item) => item.to === route.path)
  return found?.title ?? '轻记'
})

// 仅在今日/便签/日记三页显示全局日历按钮（设置页不需要选日期）
const showDatePicker = computed(() =>
  ['today', 'notes', 'diary'].includes(String(route.name ?? ''))
)
</script>

<template>
  <div class="flex h-full">
    <SideNav />

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="app-header">
        <h1 class="text-xl font-semibold" style="color: var(--color-text-primary)">
          {{ pageTitle }}
        </h1>
        <DatePickerButton v-if="showDatePicker" />
      </header>

      <main class="app-main">
        <RouterView />
      </main>
    </div>

    <BottomTabBar />
  </div>
</template>
