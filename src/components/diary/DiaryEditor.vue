<script setup lang="ts">
// 日记编辑器：使用 CodeMirror 6
// Tab/Shift+Tab → indentWithTab（成熟库内置）
// Ctrl+Z/Y → history + historyKeymap（成熟库内置）
// 不再自己造撤销轮子
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { EditorView, keymap, placeholder as cmPlaceholder, type ViewUpdate } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { useDiaryStore } from '@/stores/diary'
import { formatCreatedDate, formatModifiedDate } from '@/utils/time'

const props = defineProps<{
  date: string
  initialContent: string
}>()

const store = useDiaryStore()

const draft = ref<string>(props.initialContent)
const editorRef = ref<HTMLDivElement | null>(null)
const view = shallowRef<EditorView | null>(null)

type SaveStatus = 'idle' | 'saving' | 'saved'
const saveStatus = ref<SaveStatus>('idle')

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let savedTimer: ReturnType<typeof setTimeout> | null = null
let lastSavedContent = props.initialContent

const dateLabel = computed(() => {
  try {
    const [y, m, d] = props.date.split('-').map(Number)
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    }).format(new Date(y, (m || 1) - 1, d || 1))
  } catch {
    return props.date
  }
})

const weekdayLabel = computed(() => {
  try {
    const [y, m, d] = props.date.split('-').map(Number)
    return new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(
      new Date(y, (m || 1) - 1, d || 1)
    )
  } catch {
    return ''
  }
})

const fullDateLabel = computed(() => {
  try {
    const [y, m, d] = props.date.split('-').map(Number)
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric'
    }).format(new Date(y, (m || 1) - 1, d || 1))
  } catch {
    return props.date
  }
})

const isToday = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return props.date === `${y}-${m}-${d}`
})

const placeholder = computed(() =>
  isToday.value ? '今天发生了什么？记录下来吧…' : '这一天发生了什么？记录下来吧…'
)

const createdLabel = computed(() => {
  const d = store.currentDiary
  return d && d.date === props.date ? formatCreatedDate(d.created_at) : ''
})
const updatedLabel = computed(() => {
  const d = store.currentDiary
  return d && d.date === props.date ? formatModifiedDate(d.updated_at) : ''
})

const saveLabel = computed(() => {
  switch (saveStatus.value) {
    case 'saving': return '保存中…'
    case 'saved': return '已保存'
    default: return ''
  }
})

// CodeMirror 主题样式：让编辑器看起来和原来的 textarea 一致
const editorTheme = EditorView.theme({
  '&': {
    fontSize: '1rem',
    height: '100%',
    backgroundColor: 'transparent',
  },
  '.cm-scroller': {
    fontFamily: 'inherit',
    lineHeight: '1.8',
  },
  '.cm-content': {
    caretColor: 'var(--color-accent)',
    color: 'var(--color-text-primary)',
    padding: '1.25rem 1.5rem 2rem',
    tabSize: '4',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-gutters': {
    display: 'none',
  },
  '.cm-placeholder': {
    color: 'var(--color-text-secondary)',
    opacity: '0.55',
  },
})

function createEditor(content: string): EditorView {
  const state = EditorState.create({
    doc: content,
    extensions: [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      EditorView.lineWrapping,
      cmPlaceholder(placeholder.value),
      EditorView.contentAttributes.of({ 'aria-label': `${dateLabel.value} 日记` }),
      editorTheme,
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          draft.value = update.state.doc.toString()
          scheduleSave()
        }
      }),
    ],
  })
  return new EditorView({ state, parent: editorRef.value! })
}

onMounted(() => {
  if (editorRef.value) {
    view.value = createEditor(props.initialContent)
  }
})

// 切换日期时重建编辑器（保证撤销栈干净）
watch(
  () => props.initialContent,
  (newContent) => {
    const v = view.value
    if (!v) return
    if (v.state.doc.toString() === newContent) return
    v.destroy()
    view.value = createEditor(newContent)
    lastSavedContent = newContent
    draft.value = newContent
  }
)

onBeforeUnmount(() => {
  flushSave()
  if (view.value) {
    view.value.destroy()
    view.value = null
  }
  if (savedTimer) {
    clearTimeout(savedTimer)
    savedTimer = null
  }
})

function scheduleSave(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  saveStatus.value = 'saving'
  debounceTimer = setTimeout(() => {
    void doSave()
  }, 1000)
}

async function doSave(): Promise<void> {
  debounceTimer = null
  const content = draft.value
  if (content === lastSavedContent) {
    saveStatus.value = 'idle'
    return
  }
  const isEmpty = content.trim() === ''
  try {
    if (isEmpty) {
      const existing = store.currentDiary
      if (existing && existing.date === props.date) {
        await store.deleteDiary(props.date)
        saveStatus.value = 'saved'
        scheduleSavedReset()
      } else {
        saveStatus.value = 'idle'
      }
      lastSavedContent = content
    } else {
      await store.saveDiary(props.date, content)
      lastSavedContent = content
      saveStatus.value = 'saved'
      scheduleSavedReset()
    }
  } catch {
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
</script>

<template>
  <div class="diary-editor">
    <div class="editor-header">
      <div class="editor-date-wrap">
        <h2 class="editor-date-full">{{ fullDateLabel }}</h2>
        <p class="editor-date-weekday">{{ weekdayLabel }}</p>
      </div>
      <div class="editor-status" :class="`is-${saveStatus}`">
        <span v-if="saveStatus !== 'idle'" class="status-dot"></span>
        <span class="status-text">{{ saveLabel }}</span>
      </div>
    </div>

    <p v-if="createdLabel" class="editor-time">
      创建于 {{ createdLabel }} · 修改于 {{ updatedLabel }}
    </p>

    <div ref="editorRef" class="editor-cm-wrap"></div>
  </div>
</template>

<style scoped>
.diary-editor {
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

.editor-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.editor-date-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.editor-date-full {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text-primary);
}

.editor-date-weekday {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.editor-time {
  margin: 0;
  padding: 0.5rem 1.5rem 0;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  opacity: 0.75;
}

@media (min-width: 768px) {
  .editor-time {
    padding: 0.5rem 2rem 0;
  }
}

.editor-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 1.25rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  padding-top: 0.25rem;
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
  animation: diary-pulse 1.2s ease-in-out infinite;
}
@keyframes diary-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.editor-cm-wrap {
  flex: 1 1 auto;
  min-height: 60vh;
  overflow: auto;
}

.editor-cm-wrap :deep(.cm-editor) {
  height: 100%;
  min-height: 60vh;
}

.editor-cm-wrap :deep(.cm-scroller) {
  overflow: auto;
}

@media (min-width: 768px) {
  .editor-cm-wrap {
    min-height: calc(100vh - 220px);
  }

  .editor-cm-wrap :deep(.cm-editor) {
    min-height: calc(100vh - 220px);
  }

  .editor-cm-wrap :deep(.cm-content) {
    font-size: 1.025rem;
    padding: 1.5rem 2rem 2.5rem;
  }
}
</style>