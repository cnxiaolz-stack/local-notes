<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { navItems } from '@/components/navItems'
</script>

<template>
  <aside
    class="hidden md:flex md:w-56 md:shrink-0 md:flex-col"
    style="background-color: var(--color-surface-strong); backdrop-filter: blur(var(--glass-blur)); -webkit-backdrop-filter: blur(var(--glass-blur)); border-right: 1px solid var(--color-border-subtle)"
  >
    <div class="flex items-center gap-2.5 px-5 py-5">
      <img src="/favicon.svg" alt="轻记" class="h-8 w-8 rounded-lg" />
      <span class="text-lg font-semibold" style="color: var(--color-text-primary)">轻记</span>
    </div>

    <nav class="flex flex-1 flex-col gap-1 px-3 py-2">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-link"
      >
        <AppIcon :name="item.icon" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="px-3 pb-4 pt-2"></div>
  </aside>
</template>
