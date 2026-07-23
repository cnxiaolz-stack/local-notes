<script setup lang="ts">
// 便签内联卡片编辑器：
// - note 为 null 时为"新建草稿态"：内容非空才落库（createNote），全程空白则不保存
// - note 非 null 时为"编辑态"：清空内容则删除该条（deleteNote），非空则更新
// - 单一 content 输入框（无标题）；存储层 title 恒写空字符串以保持 schema 兼容
// - debounce 800ms 自动保存；归档按钮 toggle；显示创建/修改时间
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Note } from '@/types'
import { useNoteStore } from '@/stores/note'
import { formatCreatedDate, formatModifiedDate } from '@/utils/time'

const props = defineProps<{ note: Note | null; date: string }>()
const emit = defineEmits<{
  created: [note: Note]
  deleted: [id: string]
  close: []
}>()

const store = useNoteStore()

/** 当前编辑的便签（null = 新建草稿态） */
const currentNote = ref<Note | null>(props.note)
/** 新建落库使用的日期（挂载时捕获，避免切日期后错乱） */
const capturedDate = ref<string>(props.date)

const contentDraft = ref<string>(props.note?.content ?? '')
const contentRef = ref<HTMLTextAreaElement | null>(null)

type SaveStatus = 'idle' | 'saving' | 'saved'
const saveStatus = ref<SaveStatus>('idle')

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let savedTimer: ReturnType<typeof setTimeout> | null = null
let lastSavedContent = props.note?.content ?? ''

const saveLabel = computed(() => {
  switch (saveStatus.value) {
    case 'saving':
      return '保存中…'
    case 'saved':
      return '已保存'
    default:
      return ''
  }
})

const isPersisted = computed(() => currentNote.value !== null)
const isArchived = computed(() => currentNote.value?.archived ?? false)
const createdLabel = computed(() =>
  currentNote.value ? formatCreatedDate(currentNote.value.created_at) : ''
)
const updatedLabel = computed(() =>
  currentNote.value ? formatModifiedDate(currentNote.value.updated_at) : ''
)

onMounted(() => {
  autoGrow()
  contentRef.value?.focus()
})

onBeforeUnmount(() => {
  flushSave()
  if (savedTimer) {
    clearTimeout(savedTimer)
    savedTimer = null
  }
})

function autoGrow(): void {
  const el = contentRef.value
  if (!el) return
  el.style.height = 'auto'
  const h = Math.min(el.scrollHeight, 320)
  el.style.height = `${h}px`
}

function scheduleSave(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  saveStatus.value = 'saving'
  debounceTimer = setTimeout(() => {
    void doSave()
  }, 800)
}

function isEmpty(content: string): boolean {
  return !content.trim()
}

async function doSave(): Promise<void> {
  debounceTimer = null
  const content = contentDraft.value

  if (!currentNote.value) {
    // 新建草稿态：空内容不保存
    if (isEmpty(content)) {
      saveStatus.value = 'idle'
      return
    }
    if (content === lastSavedContent) {
      saveStatus.value = 'idle'
      return
    }
    try {
      const created = await store.createNote({
        title: '',
        content,
        date: capturedDate.value
      })
      currentNote.value = created
      lastSavedContent = content
      saveStatus.value = 'saved'
      emit('created', created)
      scheduleSavedReset()
    } catch (err) {
      console.error('[qingji] 便签保存失败：', err)
      saveStatus.value = 'idle'
    }
    return
  }

  // 已落库态：清空内容则删除该条
  if (isEmpty(content)) {
    try {
      await store.deleteNote(currentNote.value.id)
      emit('deleted', currentNote.value.id)
      currentNote.value = null
      saveStatus.value = 'idle'
    } catch (err) {
      console.error('[qingji] 便签删除失败：', err)
      saveStatus.value = 'idle'
    }
    return
  }

  if (content === lastSavedContent) {
    saveStatus.value = 'idle'
    return
  }
  try {
    const updated = await store.updateNote(currentNote.value.id, { title: '', content })
    currentNote.value = updated
    lastSavedContent = content
    saveStatus.value = 'saved'
    scheduleSavedReset()
  } catch (err) {
    console.error('[qingji] 便签更新失败：', err)
    saveStatus.value = 'idle'
  }
}

function scheduleSavedReset(): void {
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => {
    saveStatus.value = 'idle'
    savedTimer = null
  }, 2000)
}

function flushSave(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
    void doSave()
  }
}

function onContentInput(): void {
  scheduleSave()
  autoGrow()
}

function handleClose(): void {
  flushSave()
  emit('close')
}

async function handleToggleArchive(): Promise<void> {
  if (!currentNote.value) return
  flushSave()
  const n = currentNote.value
  try {
    const updated = n.archived
      ? await store.unarchiveNote(n.id)
      : await store.archiveNote(n.id)
    currentNote.value = updated
  } catch (err) {
    console.error('[qingji] 归档操作失败：', err)
  }
}
</script>

<template>
  <div class="note-editor" :class="{ 'is-archived': isArchived }">
    <div class="editor-topbar">
      <div class="editor-status" :class="`is-${saveStatus}`">
        <span v-if="saveStatus !== 'idle'" class="status-dot"></span>
        <span class="status-text">{{ saveLabel }}</span>
      </div>
      <button
        type="button"
        class="editor-icon-btn editor-close"
        aria-label="关闭编辑"
        @click="handleClose"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <textarea
      ref="contentRef"
      v-model="contentDraft"
      class="editor-content"
      placeholder="写点什么…"
      @input="onContentInput"
    ></textarea>

    <div class="editor-footer">
      <p v-if="isPersisted" class="editor-time">
        创建于 {{ createdLabel }} · 修改于 {{ updatedLabel }}
      </p>
      <div class="editor-actions">
        <span v-if="isArchived" class="archived-badge">已归档</span>
        <button
          v-if="isPersisted"
          type="button"
          class="editor-icon-btn editor-archive"
          :aria-label="isArchived ? '取消归档' : '归档便签'"
          @click="handleToggleArchive"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
          <span>{{ isArchived ? '取消归档' : '归档' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-editor {
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
}
.note-editor.is-archived {
  opacity: 0.78;
}

.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem 0.375rem;
}

.editor-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 32px;
  padding: 0 0.625rem;
  border-radius: 0.5rem;
  border: none;
  background-color: transparent;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 200ms ease, background-color 200ms ease, transform 120ms ease;
}
.editor-icon-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-soft);
}
.editor-icon-btn:active {
  transform: scale(0.94);
}
.editor-close {
  padding: 0;
  width: 32px;
}

.editor-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 1.25rem;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}
.editor-status.is-saved {
  color: var(--color-accent);
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background-color: currentColor;
}
.editor-status.is-saving .status-dot {
  animation: note-pulse 1.2s ease-in-out infinite;
}
@keyframes note-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.editor-content {
  display: block;
  width: 100%;
  min-height: 120px;
  max-height: 320px;
  margin: 0;
  padding: 0.5rem 1rem 0.75rem;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  background-color: transparent;
  border: none;
  outline: none;
  resize: none;
  overflow-y: auto;
}
.editor-content::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.875rem 0.625rem;
  border-top: 1px solid var(--color-border-subtle);
}

.editor-time {
  margin: 0;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  opacity: 0.85;
  min-width: 0;
}

.editor-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.archived-badge {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  background-color: var(--color-border);
  padding: 0.125rem 0.4rem;
  border-radius: 9999px;
  white-space: nowrap;
}

.editor-archive:hover {
  color: var(--color-brand);
}
</style>
