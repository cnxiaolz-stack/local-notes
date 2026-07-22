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
    <nav class="flex flex-1 flex-col gap-1 px-3 pt-6 pb-2">
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
