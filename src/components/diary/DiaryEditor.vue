<script setup lang="ts">
// 日记编辑器：大文本输入区 + 日期显示 + 1000ms debounce 自动保存
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useDiaryStore } from '@/stores/diary'
import { formatCreatedDate, formatModifiedDate } from '@/utils/time'

const props = defineProps<{
  /** 当前编辑的日期（YYYY-MM-DD） */
  date: string
  /** 初始内容（加载到的日记正文，无则为空字符串） */
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
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
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
  isToday.value
    ? '今天发生了什么？记录下来吧…'
    : '这一天发生了什么？记录下来吧…'
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
})

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
      // 内容清空：若已有日记则删除，否则不操作（不保留空日记）
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
  scheduleSave()
  autoGrow()
}

/**
 * Tab 键在光标处插入制表符（不跳出焦点）。
 * 有选区时：将选区整体缩进（每行前加一个制表符）；Shift+Tab 反向缩进。
 * 无选区时：直接插入一个制表符，光标移到制表符后。
 */
function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Tab') return
  e.preventDefault()
  const el = textareaRef.value
  if (!el) return
  const { selectionStart: start, selectionEnd: end, value } = el
  const TAB = '\t'

  if (start === end) {
    // 无选区：光标处插入制表符
    const next = value.slice(0, start) + TAB + value.slice(end)
    draft.value = next
    nextTick(() => {
      el.selectionStart = el.selectionEnd = start + TAB.length
    })
    return
  }

  // 有选区：按行缩进
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const selected = value.slice(lineStart, end)
  if (e.shiftKey) {
    // 反向缩进：去掉每行行首的一个制表符（若无可去则保持原样）
    const lines = selected.split('\n')
    const dedented = lines
      .map((line) => {
        if (line.startsWith(TAB)) return line.slice(TAB.length)
        // 兼容：行首是 2 空格也视作缩进去掉
        if (line.startsWith('  ')) return line.slice(2)
        return line
      })
      .join('\n')
    const next = value.slice(0, lineStart) + dedented + value.slice(end)
    draft.value = next
    nextTick(() => {
      el.selectionStart = lineStart
      el.selectionEnd = lineStart + dedented.length
    })
  } else {
    // 正向缩进：每行行首加制表符
    const lines = selected.split('\n')
    const indented = lines.map((line) => TAB + line).join('\n')
    const next = value.slice(0, lineStart) + indented + value.slice(end)
    draft.value = next
    nextTick(() => {
      el.selectionStart = lineStart
      el.selectionEnd = lineStart + indented.length
    })
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

    <textarea
      ref="textareaRef"
      v-model="draft"
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
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
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
  tab-size: 2;
  -moz-tab-size: 2;
  -o-tab-size: 2;
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
