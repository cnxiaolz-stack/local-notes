<script setup lang="ts">
// 日记编辑器：大文本输入区 + 日期显示 + 1000ms debounce 自动保存
// 关键设计：
// - 不使用 v-model（Vue 在 input 事件后会重置 textarea.value，破坏原生撤销栈）
// - 自定义撤销/重做栈，完全可控，不依赖 execCommand / WebView2 quirk
// - Tab 插入制表符 \t（CSS tab-size:4 显示 4 宽），Shift+Tab 删除光标前缩进
// - 中文输入法 composition 期间不记录撤销点，避免中间态污染栈
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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

/* ============================================================
 * 自定义撤销 / 重做栈
 * 不依赖浏览器原生撤销（v-model 会破坏它），也不依赖 execCommand
 * （WebView2 上不可靠）。完全手动管理，Ctrl+Z / Ctrl+Y 自己拦截。
 * ============================================================ */

interface Snapshot {
  value: string
  start: number
  end: number
}

const undoStack: Snapshot[] = []
const redoStack: Snapshot[] = []
const MAX_UNDO = 200

/** 中文输入法组合中，避免中间态入栈 */
let isComposing = false

function applySnapshot(s: Snapshot): void {
  const el = textareaRef.value
  if (!el) return
  el.value = s.value
  el.selectionStart = s.start
  el.selectionEnd = s.end
  draft.value = s.value
  scheduleSave()
  autoGrow()
}

/** 把当前状态压入撤销栈（值未变化时跳过） */
function commit(): void {
  const el = textareaRef.value
  if (!el) return
  const s: Snapshot = {
    value: el.value,
    start: el.selectionStart,
    end: el.selectionEnd
  }
  const top = undoStack[undoStack.length - 1]
  if (top && top.value === s.value) return
  undoStack.push(s)
  if (undoStack.length > MAX_UNDO) undoStack.shift()
  redoStack.length = 0
}

function undo(): void {
  if (undoStack.length < 2) return
  // 当前状态移入 redo
  const current = undoStack.pop()!
  redoStack.push(current)
  // 应用上一个状态
  const prev = undoStack[undoStack.length - 1]
  applySnapshot(prev)
}

function redo(): void {
  if (redoStack.length === 0) return
  const next = redoStack.pop()!
  undoStack.push(next)
  applySnapshot(next)
}

/** 直接设置 textarea 内容 + 选区，并同步 draft / 保存 / 高度 */
function setTextarea(value: string, start: number, end: number): void {
  const el = textareaRef.value
  if (!el) return
  el.value = value
  el.selectionStart = start
  el.selectionEnd = end
  draft.value = value
  scheduleSave()
  autoGrow()
}

/* ============================================================
 * Shift 键全局跟踪（兜底 WebView2 下 e.shiftKey 不可靠的情况）
 * ============================================================ */
let shiftPressed = false
function onGlobalKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Shift') shiftPressed = true
}
function onGlobalKeyUp(e: KeyboardEvent): void {
  if (e.key === 'Shift') shiftPressed = false
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown)
  window.addEventListener('keyup', onGlobalKeyUp)
  const el = textareaRef.value
  if (el) {
    // 不用 v-model，手动设置初始值，避免 Vue 接管 textarea.value
    el.value = props.initialContent
    undoStack.push({ value: props.initialContent, start: 0, end: 0 })
  }
  autoGrow()
})

/** 切换日期时重置编辑器内容和撤销栈 */
watch(
  () => props.initialContent,
  (newContent) => {
    const el = textareaRef.value
    if (!el) return
    if (el.value === newContent) return
    el.value = newContent
    draft.value = newContent
    lastSavedContent = newContent
    undoStack.length = 0
    redoStack.length = 0
    undoStack.push({ value: newContent, start: 0, end: 0 })
    autoGrow()
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeyDown)
  window.removeEventListener('keyup', onGlobalKeyUp)
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
  // 中文输入法组合期间不记录撤销点（中间态无意义）
  if (!isComposing) commit()
  scheduleSave()
  autoGrow()
}

function onCompositionStart(): void {
  isComposing = true
}

function onCompositionEnd(): void {
  isComposing = false
  // 组合输入完成后记录一次最终状态
  commit()
}

/**
 * 键盘处理：
 * - Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z：自定义撤销 / 重做
 * - Tab：插入制表符 \t
 * - Shift+Tab：删除光标前的一个缩进单位（\t 或最多 4 空格）
 * Shift 检测用 e.shiftKey || shiftPressed 双重判断，shiftPressed 兜底 WebView2 异常。
 */
function onKeyDown(e: KeyboardEvent): void {
  // 撤销 / 重做（拦截浏览器原生行为，改用自定义栈）
  const ctrl = e.ctrlKey || e.metaKey
  if (ctrl && !e.altKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
      return
    }
    if (e.key === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
      e.preventDefault()
      redo()
      return
    }
  }

  if (e.key !== 'Tab') return
  e.preventDefault()

  const isShift = e.shiftKey || shiftPressed
  const el = textareaRef.value
  if (!el) return
  const { selectionStart: start, selectionEnd: end, value } = el

  // 操作前先把当前状态压栈（保证 Tab 操作可被 undo）
  commit()

  if (start === end) {
    /* ---- 无选区 ---- */
    if (isShift) {
      // Shift+Tab：删除光标前的一个缩进单位
      const before = value.slice(0, start)
      if (before.endsWith('\t')) {
        // 光标前是 \t，删掉它
        const newValue = value.slice(0, start - 1) + value.slice(start)
        setTextarea(newValue, start - 1, start - 1)
      } else {
        // 统计光标前连续空格数，删掉 min(连续数, 4) 个
        let remove = 0
        while (remove < 4 && before[start - 1 - remove] === ' ') remove++
        if (remove > 0) {
          const newValue = value.slice(0, start - remove) + value.slice(start)
          setTextarea(newValue, start - remove, start - remove)
        }
      }
    } else {
      // Tab：在光标处插入制表符 \t
      const newValue = value.slice(0, start) + '\t' + value.slice(end)
      setTextarea(newValue, start + 1, start + 1)
    }
  } else {
    /* ---- 有选区：按行缩进 ---- */
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const selected = value.slice(lineStart, end)

    if (isShift) {
      // 反向缩进：每行行首去掉 \t 或最多 4 空格
      const dedented = selected
        .split('\n')
        .map((line) => {
          if (line.startsWith('\t')) return line.slice(1)
          let remove = 0
          while (remove < 4 && line[remove] === ' ') remove++
          return line.slice(remove)
        })
        .join('\n')
      const newValue = value.slice(0, lineStart) + dedented + value.slice(end)
      setTextarea(newValue, lineStart, lineStart + dedented.length)
    } else {
      // 正向缩进：每行行首加 \t
      const indented = selected
        .split('\n')
        .map((line) => '\t' + line)
        .join('\n')
      const newValue = value.slice(0, lineStart) + indented + value.slice(end)
      setTextarea(newValue, lineStart, lineStart + indented.length)
    }
  }

  // 操作后把新状态压栈
  commit()
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

    <!--
      不使用 v-model：Vue 的 v-model 会在 input 事件后把 draft 写回
      textarea.value，这会清空浏览器原生撤销栈。改为手动管理 value，
      用自定义撤销栈完全控制 Ctrl+Z / Ctrl+Y 行为。
    -->
    <textarea
      ref="textareaRef"
      class="editor-textarea"
      :placeholder="placeholder"
      :aria-label="`${dateLabel} 日记`"
      @input="onInput"
      @keydown="onKeyDown"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
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
  /* 制表符显示宽度为 4 个字符宽 */
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
