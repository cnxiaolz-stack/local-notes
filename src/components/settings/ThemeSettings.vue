<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import type { ThemeMode } from '@/stores/app'
import AppIcon from '@/components/AppIcon.vue'

const app = useAppStore()

interface ThemeOption {
  mode: ThemeMode
  label: string
  icon: string
  desc: string
}

const options: ThemeOption[] = [
  { mode: 'light', label: '浅色', icon: 'sun', desc: '明亮的浅色界面' },
  { mode: 'dark', label: '深色', icon: 'moon', desc: '护眼的深色界面' },
  { mode: 'system', label: '跟随系统', icon: 'monitor', desc: '自动匹配系统主题' }
]

function select(mode: ThemeMode): void {
  app.setTheme(mode)
}
</script>

<template>
  <div class="card">
    <div class="section-header">
      <h3 class="section-title">外观</h3>
      <p class="section-desc">选择应用的显示主题</p>
    </div>
    <div class="theme-grid">
      <button
        v-for="opt in options"
        :key="opt.mode"
        type="button"
        class="theme-option"
        :class="{ 'is-active': app.theme === opt.mode }"
        :aria-pressed="app.theme === opt.mode"
        @click="select(opt.mode)"
      >
        <AppIcon :name="opt.icon" :size="22" class="theme-icon" />
        <span class="theme-label">{{ opt.label }}</span>
        <span class="theme-desc">{{ opt.desc }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.section-header {
  margin-bottom: 1.125rem;
}
.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}
.section-desc {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.theme-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}
@media (min-width: 480px) {
  .theme-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 1.125rem 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg);
  cursor: pointer;
  transition: background-color 200ms ease, border-color 200ms ease,
    color 200ms ease, transform 120ms ease;
}
.theme-option:hover {
  border-color: var(--color-brand);
}
.theme-option:active {
  transform: scale(0.97);
}
.theme-option.is-active {
  background-color: var(--color-brand);
  border-color: var(--color-brand);
}

.theme-icon {
  color: var(--color-text-secondary);
  transition: color 200ms ease;
}
.theme-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
.theme-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.theme-option.is-active .theme-icon,
.theme-option.is-active .theme-desc {
  color: rgba(255, 255, 255, 0.85);
}
.theme-option.is-active .theme-label {
  color: #fff;
}
</style>
