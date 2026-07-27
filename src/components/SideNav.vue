<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { navItems } from '@/components/navItems'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
</script>

<template>
  <aside
    class="hidden md:flex md:shrink-0 md:flex-col transition-[width] duration-200"
    :class="app.sidebarCollapsed ? 'md:w-14' : 'md:w-56'"
    style="background-color: var(--color-surface-strong); backdrop-filter: blur(var(--glass-blur)); -webkit-backdrop-filter: blur(var(--glass-blur)); border-right: 1px solid var(--color-border-subtle)"
  >
    <nav class="flex flex-1 flex-col gap-1 px-2 pt-6 pb-2">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-link"
        :class="{ 'justify-center': app.sidebarCollapsed }"
        :title="app.sidebarCollapsed ? item.label : undefined"
      >
        <AppIcon :name="item.icon" />
        <span v-show="!app.sidebarCollapsed">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="px-2 pb-4 pt-2">
      <button
        type="button"
        class="nav-link w-full"
        :class="{ 'justify-center': app.sidebarCollapsed }"
        :title="app.sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="app.toggleSidebar()"
      >
        <AppIcon :name="app.sidebarCollapsed ? 'chevron-right' : 'chevron-left'" />
        <span v-show="!app.sidebarCollapsed">收起</span>
      </button>
    </div>
  </aside>
</template>