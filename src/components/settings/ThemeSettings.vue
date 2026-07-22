<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import type { AppTheme } from '@/stores/app'

const app = useAppStore()

interface ThemeCard {
  key: AppTheme
  label: string
  desc: string
  preview: {
    bg: string
    surface: string
    border: string
    text: string
    secondary: string
    brand: string
  }
}

const themes: ThemeCard[] = [
  {
    key: 'minimal',
    label: '纯白极简',
    desc: 'Notion 风，干净克制',
    preview: { bg: '#ffffff', surface: '#ffffff', border: '#e5e7eb', text: '#111827', secondary: '#6b7280', brand: '#111827' }
  },
  {
    key: 'paper',
    label: '暖纸书卷',
    desc: '米黄纸感，温暖',
    preview: { bg: '#faf6ef', surface: '#fffdf8', border: '#e8ddc7', text: '#3d2f1f', secondary: '#8a7558', brand: '#a0522d' }
  },
  {
    key: 'ink',
    label: '墨黑沉静',
    desc: '深色护眼，沉浸',
    preview: { bg: '#0f172a', surface: '#1e293b', border: '#334155', text: '#f1f5f9', secondary: '#94a3b8', brand: '#fbbf24' }
  },
  {
    key: 'mint',
    label: '清新薄荷',
    desc: '薄荷绿，清爽',
    preview: { bg: '#f0fdf4', surface: '#ffffff', border: '#d1fae5', text: '#064e3b', secondary: '#4b5563', brand: '#059669' }
  },
  {
    key: 'morandi',
    label: '莫兰迪灰调',
    desc: '低饱和，高级感',
    preview: { bg: '#e8e4dc', surface: '#f4f1ea', border: '#c9c3b6', text: '#4a463f', secondary: '#8b8478', brand: '#7c8a8a' }
  },
  {
    key: 'sunlit',
    label: '暖阳橙白',
    desc: '暖橙，明亮活力',
    preview: { bg: '#fffaf5', surface: '#ffffff', border: '#fed7aa', text: '#7c2d12', secondary: '#9a5230', brand: '#ea580c' }
  }
]

function select(key: AppTheme): void {
  app.setTheme(key)
}
</script>

<template>
  <div class="card">
    <div class="section-header">
      <h3 class="section-title">页面风格</h3>
      <p class="section-desc">选择你喜欢的整体配色风格</p>
    </div>
    <div class="theme-grid">
      <button
        v-for="t in themes"
        :key="t.key"
        type="button"
        class="theme-card"
        :class="{ 'is-active': app.theme === t.key }"
        :aria-pressed="app.theme === t.key"
        @click="select(t.key)"
      >
        <!-- 风格预览：模拟一个任务卡片 -->
        <div class="card-preview" :style="{
          backgroundColor: t.preview.bg,
          borderColor: t.preview.border
        }">
          <div class="preview-card" :style="{
            backgroundColor: t.preview.surface,
            borderColor: t.preview.border
          }">
            <div class="preview-check" :style="{ backgroundColor: t.preview.brand }"></div>
            <div class="preview-lines">
              <div class="preview-title" :style="{ backgroundColor: t.preview.text }"></div>
              <div class="preview-sub" :style="{ backgroundColor: t.preview.secondary }"></div>
            </div>
          </div>
          <div class="preview-card preview-card-2" :style="{
            backgroundColor: t.preview.surface,
            borderColor: t.preview.border
          }">
            <div class="preview-check" :style="{ borderColor: t.preview.border }"></div>
            <div class="preview-lines">
              <div class="preview-title" :style="{ backgroundColor: t.preview.secondary }"></div>
            </div>
          </div>
        </div>

        <div class="card-info">
          <div class="card-label-row">
            <span class="card-label">{{ t.label }}</span>
            <svg
              v-if="app.theme === t.key"
              class="card-check"
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
          </div>
          <p class="card-desc">{{ t.desc }}</p>
        </div>
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
  gap: 0.875rem;
}
@media (min-width: 480px) {
  .theme-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 720px) {
  .theme-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.theme-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  border-radius: 0.875rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 200ms ease, transform 120ms ease, box-shadow 200ms ease;
}
.theme-card:hover {
  border-color: var(--color-brand);
  box-shadow: var(--glass-shadow);
}
.theme-card:active {
  transform: scale(0.98);
}
.theme-card.is-active {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 2px var(--color-brand-soft);
}

.card-preview {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 92px;
}
.preview-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border-radius: 0.5rem;
  border: 1px solid;
}
.preview-card-2 {
  opacity: 0.7;
}
.preview-check {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
  border: 1.5px solid;
}
.preview-card-2 .preview-check {
  background-color: transparent !important;
}
.preview-lines {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.preview-title {
  height: 5px;
  border-radius: 999px;
  width: 70%;
}
.preview-sub {
  height: 4px;
  border-radius: 999px;
  width: 45%;
  opacity: 0.7;
}

.card-info {
  padding: 0.625rem 0.75rem 0.75rem;
}
.card-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.375rem;
}
.card-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}
.card-check {
  color: var(--color-brand);
  flex-shrink: 0;
}
.card-desc {
  margin: 0.125rem 0 0;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}
</style>
