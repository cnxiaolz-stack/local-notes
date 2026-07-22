<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Note } from '@/types'
import { useNoteStore } from '@/stores/note'

const props = defineProps<{ note: Note }>()
const emit = defineEmits<{ back: []; deleted: [] }>()

const store = useNoteStore()

const titleDraft = ref<string>(props.note.title)
const contentDraft = ref<string>(props.note.content)
const titleRef = ref<HTMLInputElement | null>(null)
const contentRef = ref<HTMLTextAreaElement | null>(null)

type SaveStatus = 'idle' | 'saving' | 'saved'
const saveStatus = ref<SaveStatus>('idle')

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let savedTimer: ReturnType<typeof setTimeout> | null = null
let lastSavedTitle = props.note.title
let lastSavedContent = props.note.content

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

onMounted(() => {
  autoGrow()
  if (!titleDraft.value) {
    titleRef.value?.focus()
  }
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
  el.style.height = `${el.scrollHeight}px`
}

function scheduleSave(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  saveStatus.value = 'saving'
  debounceTimer = setTimeout(() => {
    void doSave()
  }, 800)
}

async function doSave(): Promise<void> {
  debounceTimer = null
  const title = titleDraft.value
  const content = contentDraft.value
  if (title === lastSavedTitle && content === lastSavedContent) {
    saveStatus.value = 'idle'
    return
  }
  try {
    await store.updateNote(props.note.id, { title, content })
    lastSavedTitle = title
    lastSavedContent = content
    saveStatus.value = 'saved'
    if (savedTimer) clearTimeout(savedTimer)
    savedTimer = setTimeout(() => {
      saveStatus.value = 'idle'
      savedTimer = null
    }, 2000)
  } catch {
    saveStatus.value = 'idle'
  }
}

function flushSave(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
    void doSave()
  }
}

function onTitleInput(): void {
  scheduleSave()
}

function onContentInput(): void {
  scheduleSave()
  autoGrow()
}

function onTitleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault()
    contentRef.value?.focus()
  }
}

function handleBack(): void {
  flushSave()
  emit('back')
}

function handleDelete(): void {
  if (!window.confirm('确定要删除这个便签吗？此操作不可撤销。')) return
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  void store.deleteNote(props.note.id)
  emit('deleted')
}
</script>

<template>
  <div class="note-editor">
    <div class="editor-topbar">
      <button
        type="button"
        class="editor-icon-btn editor-back"
        aria-label="返回便签列表"
        @click="handleBack"
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
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span class="editor-back-label">返回</span>
      </button>

      <div class="editor-status" :class="`is-${saveStatus}`">
        <span v-if="saveStatus !== 'idle'" class="status-dot"></span>
        <span class="status-text">{{ saveLabel }}</span>
      </div>

      <button
        type="button"
        class="editor-icon-btn editor-delete"
        aria-label="删除便签"
        @click="handleDelete"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="3 6 5 6 21 6" />
          <path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          />
        </svg>
      </button>
    </div>

    <input
      ref="titleRef"
      v-model="titleDraft"
      type="text"
      class="editor-title"
      placeholder="标题（可选）"
      autocomplete="off"
      @input="onTitleInput"
      @keydown="onTitleKeydown"
    />

    <textarea
      ref="contentRef"
      v-model="contentDraft"
      class="editor-content"
      placeholder="写点什么…"
      @input="onContentInput"
    ></textarea>
  </div>
</template>

<style scoped>
.note-editor {
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
}

.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--color-border);
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
  cursor: pointer;
  flex-shrink: 0;
  transition: color 200ms ease, background-color 200ms ease, transform 120ms ease;
}
.editor-icon-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg);
}
.editor-icon-btn:active {
  transform: scale(0.94);
}

.editor-back-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.editor-delete:hover {
  color: #ef4444;
}

.editor-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 1.25rem;
  font-size: 0.75rem;
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

.editor-title {
  display: block;
  width: 100%;
  margin: 0;
  padding: 1rem 1.125rem 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
  background-color: transparent;
  border: none;
  outline: none;
}
.editor-title::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.6;
  font-weight: 500;
}

.editor-content {
  display: block;
  width: 100%;
  min-height: 320px;
  margin: 0;
  padding: 0.5rem 1.125rem 1.25rem;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  background-color: transparent;
  border: none;
  outline: none;
  resize: none;
  overflow: hidden;
}
.editor-content::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.6;
}
</style>
