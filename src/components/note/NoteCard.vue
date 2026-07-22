<script setup lang="ts">
import { computed } from 'vue'
import type { Note } from '@/types'

const props = defineProps<{ note: Note; keyword?: string }>()
defineEmits<{ open: [] }>()

interface Chunk {
  text: string
  hit: boolean
}

const keyword = computed(() => props.keyword?.trim() ?? '')

const displayTitle = computed(() => {
  const t = props.note.title.trim()
  if (t) return t
  const firstLine = props.note.content
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean)
  return firstLine || '无标题'
})

const preview = computed(() => {
  const c = props.note.content.trim()
  if (!c) return ''
  return c.replace(/\s+/g, ' ')
})

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitHighlight(text: string): Chunk[] {
  const kw = keyword.value
  if (!kw) return [{ text, hit: false }]
  const re = new RegExp(`(${escapeRegExp(kw)})`, 'gi')
  const parts = text.split(re).filter((p) => p !== '')
  const lower = kw.toLowerCase()
  return parts.map((p) => ({ text: p, hit: p.toLowerCase() === lower }))
}

const titleChunks = computed<Chunk[]>(() => splitHighlight(displayTitle.value))
const previewChunks = computed<Chunk[]>(() => splitHighlight(preview.value))

const relativeTime = computed(() => formatRelative(props.note.updated_at))

function formatRelative(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  if (diff < 0) return '刚刚'
  const min = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  if (diff < min) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / min)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  const date = new Date(ts)
  const nowDate = new Date(now)
  const yesterday = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate() - 1
  )
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return '昨天'
  }
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`
  if (date.getFullYear() === nowDate.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}
</script>

<template>
  <article
    class="note-card"
    role="button"
    tabindex="0"
    aria-label="打开便签"
    @click="$emit('open')"
    @keydown.enter.prevent="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <h3 class="note-title">
      <template v-for="(chunk, i) in titleChunks" :key="i">
        <mark v-if="chunk.hit" class="note-hit">{{ chunk.text }}</mark>
        <template v-else>{{ chunk.text }}</template>
      </template>
    </h3>
    <p v-if="preview" class="note-preview">
      <template v-for="(chunk, i) in previewChunks" :key="i">
        <mark v-if="chunk.hit" class="note-hit">{{ chunk.text }}</mark>
        <template v-else>{{ chunk.text }}</template>
      </template>
    </p>
    <p v-else class="note-preview note-preview-empty">无内容</p>
    <p class="note-time">{{ relativeTime }}</p>
  </article>
</template>

<style scoped>
.note-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 7rem;
  padding: 1rem 1.125rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
}
.note-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border-color: var(--color-brand);
}
.note-card:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}
.note-card:active {
  transform: translateY(0);
}

.note-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.note-preview {
  margin: 0;
  flex: 1 1 auto;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
.note-preview-empty {
  font-style: italic;
  opacity: 0.6;
}

.note-time {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.75;
}

.note-hit {
  background-color: rgba(59, 130, 246, 0.2);
  color: inherit;
  border-radius: 0.125rem;
  padding: 0 0.0625rem;
}
</style>
