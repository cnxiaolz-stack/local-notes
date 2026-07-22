<script setup lang="ts">
import { computed } from 'vue'
import type { Note } from '@/types'
import { formatRelative } from '@/utils/time'

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

const createdLabel = computed(() => formatRelative(props.note.created_at))
const updatedLabel = computed(() => formatRelative(props.note.updated_at))
</script>

<template>
  <article
    class="note-card"
    :class="{ 'is-archived': note.archived }"
    role="button"
    tabindex="0"
    aria-label="打开便签"
    @click="$emit('open')"
    @keydown.enter.prevent="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <div class="note-card-head">
      <h3 class="note-title">
        <template v-for="(chunk, i) in titleChunks" :key="i">
          <mark v-if="chunk.hit" class="note-hit">{{ chunk.text }}</mark>
          <template v-else>{{ chunk.text }}</template>
        </template>
      </h3>
      <span v-if="note.archived" class="note-archived-badge">已归档</span>
    </div>
    <p v-if="preview" class="note-preview">
      <template v-for="(chunk, i) in previewChunks" :key="i">
        <mark v-if="chunk.hit" class="note-hit">{{ chunk.text }}</mark>
        <template v-else>{{ chunk.text }}</template>
      </template>
    </p>
    <p v-else class="note-preview note-preview-empty">无内容</p>
    <p class="note-time">创建于 {{ createdLabel }} · 修改于 {{ updatedLabel }}</p>
  </article>
</template>

<style scoped>
.note-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 6.5rem;
  padding: 0.875rem 1rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  box-shadow: var(--glass-shadow);
  cursor: pointer;
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
}
.note-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--glass-shadow-hover);
  border-color: var(--color-brand);
}
.note-card:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}
.note-card:active {
  transform: translateY(0);
}
.note-card.is-archived {
  opacity: 0.62;
  background-color: var(--color-bg-soft);
}

.note-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
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
  flex: 1 1 auto;
  min-width: 0;
}

.note-archived-badge {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  background-color: var(--color-border);
  padding: 0.125rem 0.4rem;
  border-radius: 9999px;
  white-space: nowrap;
}

.note-preview {
  margin: 0;
  flex: 1 1 auto;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
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
  font-size: 0.72rem;
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
