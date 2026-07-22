<script setup lang="ts">
// 日记列表视图：按月分组显示有日记的日期列表 + 内容预览
import { computed } from 'vue'
import type { Diary } from '@/types'

const props = defineProps<{
  /** 全部日记（含正文） */
  diaries: Diary[]
  /** 当前选中的日期（YYYY-MM-DD） */
  selectedDate: string
}>()
defineEmits<{ select: [date: string] }>()

interface MonthGroup {
  /** YYYY-MM */
  month: string
  /** 显示用月份标签，如 "2026年7月" */
  label: string
  items: Diary[]
}

const grouped = computed<MonthGroup[]>(() => {
  const sorted = [...props.diaries].sort((a, b) => b.date.localeCompare(a.date))
  const groups: MonthGroup[] = []
  for (const d of sorted) {
    const month = d.date.slice(0, 7)
    let group = groups.find((g) => g.month === month)
    if (!group) {
      const [y, m] = month.split('-').map(Number)
      const label = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long'
      }).format(new Date(y, (m || 1) - 1, 1))
      group = { month, label, items: [] }
      groups.push(group)
    }
    group.items.push(d)
  }
  return groups
})

function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(dt)
  return `${m}月${d}日 · ${weekday}`
}

function preview(content: string): string {
  const c = content.trim()
  if (!c) return ''
  return c.replace(/\s+/g, ' ')
}
</script>

<template>
  <div class="diary-list">
    <div v-if="grouped.length === 0" class="diary-list-empty">
      <svg
        viewBox="0 0 24 24"
        width="32"
        height="32"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <p class="empty-title">还没有日记</p>
      <p class="empty-hint">在编辑区写下第一篇吧</p>
    </div>

    <template v-for="group in grouped" :key="group.month">
      <div class="diary-month-label">{{ group.label }}</div>
      <ul class="diary-month-items">
        <li v-for="d in group.items" :key="d.date">
          <button
            type="button"
            class="diary-list-item"
            :class="{ 'is-selected': d.date === selectedDate }"
            @click="$emit('select', d.date)"
          >
            <span class="diary-list-date">{{ dayLabel(d.date) }}</span>
            <span
              v-if="preview(d.content)"
              class="diary-list-preview"
            >{{ preview(d.content) }}</span>
            <span v-else class="diary-list-preview is-empty">无内容</span>
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.diary-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.diary-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}
.empty-title {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
.empty-hint {
  margin: 0;
  font-size: 0.8rem;
}

.diary-month-label {
  margin: 0.875rem 0 0.375rem;
  padding: 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  color: var(--color-text-secondary);
}
.diary-month-label:first-child {
  margin-top: 0;
}

.diary-month-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.diary-list-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border-radius: 0.625rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  text-align: left;
  cursor: pointer;
  transition: border-color 200ms ease, background-color 200ms ease,
    transform 120ms ease;
}
.diary-list-item:hover {
  border-color: var(--color-brand);
}
.diary-list-item:active {
  transform: scale(0.99);
}
.diary-list-item.is-selected {
  border-color: var(--color-brand);
  background-color: var(--color-bg);
}

.diary-list-date {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.diary-list-preview {
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
.diary-list-preview.is-empty {
  font-style: italic;
  opacity: 0.6;
}
</style>
