<script setup lang="ts">
// 日记编辑器：
// - 不使用 v-model（Vue 在 input 事件后会重置 textarea.value，破坏原生撤销栈）
// - Tab/Shift+Tab 使用 execCommand，由浏览器原生撤销栈管理，Ctrl+Z/Y 不拦截
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDiaryStore } from '@/stores/diary'
import { formatCreatedDate, formatModifiedDate } from '@/utils/time'

const props = defineProps<{
  date: string
  initialContent: string
}>()

const store = useDiaryStore()

const draft = ref<string>(props.initialContent)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

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

onMounted(() => {
  const el = textareaRef.value
  if (el) {
    el.value = props.initialContent
  }
  autoGrow()
})

watch(
  () => props.initialContent,
  (newContent) => {
    const el = textareaRef.value
    if (!el) return
    if (el.value === newContent) return
    el.value = newContent
    draft.value = newContent
    lastSavedContent = newContent
    autoGrow()
  }
)

onBeforeUnmount(() => {
  flushSave()
  if (savedTimer) {
    clearTimeout(savedTimer)
    savedTimer = null
  }
})

function autoGrow(): void {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

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

function onInput(): void {
  const el = textareaRef.value
  if (el) draft.value = el.value
  scheduleSave()
  autoGrow()
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Tab') return
  e.preventDefault()

  const el = textareaRef.value
  if (!el) return

  const isShift = e.shiftKey
  const { selectionStart: start, selectionEnd: end, value } = el

  if (start === end) {
    if (isShift) {
      // Shift+Tab：选中行首缩进并删除（浏览器原生撤销）
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineContent = value.slice(lineStart, start)

      if (lineContent.startsWith('\t')) {
        el.setSelectionRange(lineStart, lineStart + 1)
        document.execCommand('delete', false)
      } else {
        let remove = 0
        while (remove < 4 && lineContent[remove] === ' ') remove++
        if (remove > 0) {
          el.setSelectionRange(lineStart, lineStart + remove)
          document.execCommand('delete', false)
        }
      }
    } else {
      // Tab：插入制表符（浏览器原生撤销）
      document.execCommand('insertText', false, '\t')
    }
  } else {
    // 有选区：按行缩进
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const selected = value.slice(lineStart, end)
    let result: string

    if (isShift) {
      result = selected
        .split('\n')
        .map((line) => {
          if (line.startsWith('\t')) return line.slice(1)
          let remove = 0
          while (remove < 4 && line[remove] === ' ') remove++
          return line.slice(remove)
        })
        .join('\n')
    } else {
      result = selected
        .split('\n')
        .map((line) => '\t' + line)
        .join('\n')
    }

    el.setSelectionRange(lineStart, end)
    document.execCommand('insertText', false, result)
  }

  // execCommand 后同步 draft 和保存
  draft.value = el.value
  scheduleSave()
  autoGrow()
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

    <textarea
      ref="textareaRef"
      class="editor-textarea"
      :placeholder="placeholder"
      :aria-label="`${dateLabel} 日记`"
      @input="onInput"
      @keydown="onKeyDown"
    ></textarea>
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

.editor-textarea {
  display: block;
  width: 100%;
  flex: 1 1 auto;
  min-height: 60vh;
  margin: 0;
  padding: 1.25rem 1.5rem 2rem;
  font-size: 1rem;
  line-height: 1.8;
  color: var(--color-text-primary);
  background-color: transparent;
  border: none;
  outline: none;
  resize: none;
  overflow: hidden;
  font-family: inherit;
  tab-size: 4;
  -moz-tab-size: 4;
}
.editor-textarea::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.55;
}

@media (min-width: 768px) {
  .editor-textarea {
    min-height: calc(100vh - 220px);
    font-size: 1.025rem;
    padding: 1.5rem 2rem 2.5rem;
  }
}
</style>
