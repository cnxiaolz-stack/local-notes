<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { navItems } from '@/components/navItems'
</script>

<template>
  <aside
    class="hidden md:flex md:w-56 md:shrink-0 md:flex-col"
    style="background-color: var(--color-surface); border-right: 1px solid var(--color-border)"
  >
    <div class="flex items-center gap-2.5 px-5 py-5">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold text-white"
        style="background-color: var(--color-brand)"
      >
        轻
      </div>
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

    <div class="px-3 py-3" style="border-top: 1px solid var(--color-border)">
      <ThemeToggle />
    </div>
  </aside>
</template>
