<script setup lang="ts">
// 主题切换器：6 套预设主题的下拉选择
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/app'
import type { AppTheme } from '@/stores/app'

const app = useAppStore()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

interface ThemeMeta {
  key: AppTheme
  label: string
  desc: string
  swatch: { bg: string; surface: string; brand: string; text: string }
}

const themes: ThemeMeta[] = [
  {
    key: 'minimal',
    label: '纯白极简',
    desc: 'Notion 风克制',
    swatch: { bg: '#ffffff', surface: '#ffffff', brand: '#111827', text: '#111827' }
  },
  {
    key: 'paper',
    label: '暖纸书卷',
    desc: '米黄纸感',
    swatch: { bg: '#faf6ef', surface: '#fffdf8', brand: '#a0522d', text: '#3d2f1f' }
  },
  {
    key: 'ink',
    label: '墨黑沉静',
    desc: '深色护眼',
    swatch: { bg: '#0f172a', surface: '#1e293b', brand: '#fbbf24', text: '#f1f5f9' }
  },
  {
    key: 'mint',
    label: '清新薄荷',
    desc: '薄荷绿轻盈',
    swatch: { bg: '#f0fdf4', surface: '#ffffff', brand: '#059669', text: '#064e3b' }
  },
  {
    key: 'morandi',
    label: '莫兰迪灰调',
    desc: '低饱和高级',
    swatch: { bg: '#e8e4dc', surface: '#f4f1ea', brand: '#7c8a8a', text: '#4a463f' }
  },
  {
    key: 'sunlit',
    label: '暖阳橙白',
    desc: '暖橙明亮',
    swatch: { bg: '#fffaf5', surface: '#ffffff', brand: '#ea580c', text: '#7c2d12' }
  }
]

function toggle(): void {
  open.value = !open.value
}

function select(key: AppTheme): void {
  app.setTheme(key)
  open.value = false
}

function onDocClick(e: MouseEvent): void {
  if (!rootRef.value) return
  if (!rootRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

function onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onEsc)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onEsc)
})

// 用于触发器色卡展示当前主题
function currentMeta(): ThemeMeta {
  return themes.find((t) => t.key === app.theme) ?? themes[0]
}
</script>

<template>
  <div ref="rootRef" class="theme-switcher">
    <button
      type="button"
      class="switcher-trigger"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span class="trigger-swatch" :style="{
        backgroundColor: currentMeta().swatch.bg,
        borderColor: 'var(--color-border)'
      }">
        <span class="swatch-surface" :style="{ backgroundColor: currentMeta().swatch.surface }"></span>
        <span class="swatch-brand" :style="{ backgroundColor: currentMeta().swatch.brand }"></span>
      </span>
      <span class="trigger-label">{{ currentMeta().label }}</span>
      <svg
        class="trigger-caret"
        :class="{ 'is-open': open }"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <Transition name="tsm-pop">
      <ul v-if="open" class="switcher-menu" role="listbox" aria-label="选择主题">
        <li v-for="t in themes" :key="t.key" role="option" :aria-selected="t.key === app.theme">
          <button
            type="button"
            class="menu-item"
            :class="{ 'is-active': t.key === app.theme }"
            @click="select(t.key)"
          >
            <span class="item-swatch" :style="{ backgroundColor: t.swatch.bg, borderColor: 'var(--color-border)' }">
              <span class="swatch-surface" :style="{ backgroundColor: t.swatch.surface }"></span>
              <span class="swatch-brand" :style="{ backgroundColor: t.swatch.brand }"></span>
            </span>
            <span class="item-text">
              <span class="item-label">{{ t.label }}</span>
              <span class="item-desc">{{ t.desc }}</span>
            </span>
            <svg
              v-if="t.key === app.theme"
              class="item-check"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.theme-switcher {
  position: relative;
  display: inline-block;
}

.switcher-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.625rem 0.4rem 0.5rem;
  border-radius: 0.625rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 200ms ease, color 200ms ease, background-color 200ms ease;
  width: 100%;
}
.switcher-trigger:hover {
  border-color: var(--color-brand);
  color: var(--color-text-primary);
}

.trigger-swatch {
  position: relative;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  flex-shrink: 0;
}
.swatch-surface {
  position: absolute;
  left: 3px;
  top: 3px;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
}
.swatch-brand {
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.trigger-label {
  flex: 1 1 auto;
  text-align: left;
  color: var(--color-text-primary);
  font-weight: 500;
}

.trigger-caret {
  flex-shrink: 0;
  color: var(--color-text-secondary);
  transition: transform 200ms ease;
}
.trigger-caret.is-open {
  transform: rotate(180deg);
}

.switcher-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 0.375rem;
  list-style: none;
  background-color: var(--color-surface-strong);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background-color: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  text-align: left;
  transition: background-color 160ms ease;
}
.menu-item:hover {
  background-color: var(--color-brand-soft);
}
.menu-item.is-active {
  background-color: var(--color-brand-soft);
}

.item-swatch {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  flex-shrink: 0;
}
.item-swatch .swatch-surface {
  width: 14px;
  height: 14px;
}
.item-swatch .swatch-brand {
  width: 10px;
  height: 10px;
}

.item-text {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.item-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
.item-desc {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.item-check {
  color: var(--color-brand);
  flex-shrink: 0;
}

/* 下拉动画 */
.tsm-pop-enter-active,
.tsm-pop-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.tsm-pop-enter-from,
.tsm-pop-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
