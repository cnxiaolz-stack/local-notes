<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { navItems } from '@/components/navItems'

const route = useRoute()

function isActive(to: string): boolean {
  return route.path === to
}
</script>

<template>
  <nav class="tabbar md:hidden">
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="tab-item"
      :class="{ 'tab-item-active': isActive(item.to) }"
      :aria-label="item.label"
    >
      <AppIcon :name="item.icon" :size="22" />
      <span class="text-xs">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
