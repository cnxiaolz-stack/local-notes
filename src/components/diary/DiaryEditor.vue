<script setup lang="ts">
// 日记编辑器：使用 CodeMirror 6
// Tab → 插入一个真正的制表符 \t（由 tabSize:8 渲染为 8 字符宽，是一个完整单元）
// Shift+Tab / Backspace → 把光标前紧邻的一个 \t 整体删除（一次到位，类似 WPS）
// Enter → 换行后用 \t 复制上一行行首缩进（避免 CodeMirror 默认生成空格导致退格多次）
// 选区不为空时 Tab/Shift-Tab 走 indentMore/indentLess 整行缩进
// Ctrl+Z/Y → history + historyKeymap（成熟库内置）
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { EditorView, keymap, placeholder as cmPlaceholder, type ViewUpdate } from '@codemirror/view'
import { EditorState, EditorSelection, Prec } from '@codemirror/state'
import { indentMore, indentLess } from '@codemirror/commands'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { useDiaryStore } from '@/stores/diary'
import { formatCreatedDate, formatModifiedDate } from '@/utils/time'

/**
 * 自定义 Tab / Shift+Tab / Backspace / Enter：
 * - Tab（无选区）：插入一个制表符 \t（完整单元，渲染为 8 字符宽）
 * - Shift+Tab：有选区走 indentLess 整行回退；无选区删除光标前紧邻的一个 \t
 * - Backspace：光标紧跟在 \t 之后且无选区时，整体删除该 \t（一次退掉整个缩进）
 * - Enter：换行后用 \t 复制上一行行首缩进（CodeMirror 默认会用空格，导致退格需按多次）
 * 用高优先级 Prec.highest 覆盖 defaultKeymap 里的默认行为。
 */
const tabKeymap = Prec.highest(
  keymap.of([
    {
      key: 'Tab',
      preventDefault: true,
      run: (view): boolean => {
        const { state, dispatch } = view
        // 有选区 → 整行缩进
        if (state.selection.ranges.some((r) => !r.empty)) {
          return indentMore(view)
        }
        // 无选区 → 插入一个 \t（完整缩进单元）
        dispatch(state.replaceSelection('\t'))
        return true
      }
    },
    {
      key: 'Shift-Tab',
      preventDefault: true,
      run: (view): boolean => {
        const { state } = view
        // 有选区 → 整行回退缩进
        if (state.selection.ranges.some((r) => !r.empty)) {
          return indentLess(view)
        }
        // 无选区 → 删除每个选区光标前紧邻的一个 \t
        return deletePrecedingTab(view)
      }
    },
    {
      key: 'Backspace',
      preventDefault: true,
      run: (view): boolean => {
        const { state } = view
        // 仅当所有选区都为空、且每个光标前恰好是 \t 时，整体删除该 \t
        // 否则交还默认 Backspace（删一个空格/字符）
        if (state.selection.ranges.some((r) => !r.empty)) return false
        return deletePrecedingTab(view)
      }
    },
    {
      key: 'Enter',
      preventDefault: true,
      run: (view): boolean => {
        const { state } = view
        if (state.readOnly) return false
        // 换行后用 \t 复制上一行行首缩进，保证新行缩进也是完整 \t 单元
        // （CodeMirror 默认 insertNewlineAndIndent 会用空格，导致 Backspace 需按多次）
        const changes = state.changeByRange((range) => {
          let { from, to } = range
          const line = state.doc.lineAt(from)
          const lead = /^\t*/.exec(line.text)?.[0] ?? '' // 上一行行首的制表符
          // 若光标位于行首缩进区内，把换行点移到行首（避免在缩进中间断开）
          if (
            from > line.from &&
            from < line.from + 100 &&
            !/\S/.test(line.text.slice(0, from))
          ) {
            from = line.from
          }
          // 跳过行尾空白
          while (to < line.to && /\s/.test(line.text[to - line.from])) to++
          const insert = '\n' + lead
          return {
            changes: { from, to, insert },
            range: EditorSelection.cursor(from + 1 + lead.length)
          }
        })
        view.dispatch(
          state.update(changes, { scrollIntoView: true, userEvent: 'input' })
        )
        return true
      }
    }
  ])
)

/**
 * 删除每个光标（空选区）前紧邻的一个制表符 \t。
 * 任一光标前不是 \t 则什么都不做（返回 false 把按键交还默认处理）。
 */
function deletePrecedingTab(view: EditorView): boolean {
  const { state, dispatch } = view
  const ranges = state.selection.ranges
  let allMatched = true
  const changes: { from: number; to: number }[] = []
  for (const r of ranges) {
    if (!r.empty) { allMatched = false; break }
    const pos = r.from
    if (pos <= 0 || state.doc.sliceString(pos - 1, pos) !== '\t') {
      allMatched = false
      break
    }
    changes.push({ from: pos - 1, to: pos })
  }
  if (!allMatched || changes.length === 0) return false
  dispatch(state.update({ changes, selection: { anchor: changes[0].from } }))
  return true
}

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

const placeholderText = computed(() =>
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

/**
 * 实时字数统计：去除所有空白字符后的字符数。
 * 与 draft 联动，输入即更新。
 */
const charCount = computed(() => {
  const text = draft.value || ''
  return text.replace(/\s/g, '').length
})

// CodeMirror 主题样式
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
    caretColor: 'var(--color-accent, #3b82f6)',
    color: 'var(--color-text-primary, #1e293b)',
    padding: '1.25rem 1.5rem 0.75rem',
    tabSize: '8',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-gutters': {
    display: 'none',
  },
  '.cm-placeholder': {
    color: 'var(--color-text-secondary, #64748b)',
    opacity: '0.55',
  },
})

function createEditor(content: string): EditorView {
  const state = EditorState.create({
    doc: content,
    extensions: [
      history(),
      // Tab 宽度：EditorState.tabSize facet（CodeMirror 用它计算 \t 渲染宽度，
      // 默认为 4；CSS tab-size 不生效，必须通过此 facet 设置）
      EditorState.tabSize.of(8),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      // 自定义 Tab/Shift+Tab（最高优先级，覆盖 defaultKeymap 默认 Tab）
      tabKeymap,
      EditorView.lineWrapping,
      cmPlaceholder(placeholderText.value),
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
      <h2 class="editor-date-full">{{ fullDateLabel }}</h2>
      <div class="editor-date-row">
        <p class="editor-date-weekday">{{ weekdayLabel }}</p>
        <p v-if="createdLabel" class="editor-time">
          创建于 {{ createdLabel }} · 修改于 {{ updatedLabel }}
        </p>
      </div>
    </div>

    <div ref="editorRef" class="editor-cm-host"></div>

    <div class="editor-footer">
      <span class="footer-word-count">{{ charCount }} 字</span>
      <span class="meta-divider" aria-hidden="true">·</span>
      <div class="editor-status" :class="`is-${saveStatus}`">
        <span v-if="saveStatus !== 'idle'" class="status-dot"></span>
        <span class="status-text">{{ saveLabel }}</span>
      </div>
    </div>
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
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.625rem 1.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.editor-date-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
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
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  opacity: 0.75;
  text-align: right;
}

@media (min-width: 768px) {
  .editor-header {
    padding-left: 2rem;
    padding-right: 2rem;
  }
  .editor-footer {
    padding: 0.4rem 2rem;
  }
}

.editor-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 1.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  padding: 0.4rem 1.5rem;
}

.footer-word-count {
  font-variant-numeric: tabular-nums;
}

.meta-divider {
  opacity: 0.5;
}

.editor-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
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

/* CodeMirror 容器：必须给确定高度，否则 .cm-editor 高度为 0 */
.editor-cm-host {
  flex: 1 1 auto;
  min-height: 60vh;
  display: flex;
  flex-direction: column;
}

.editor-cm-host :deep(.cm-editor) {
  height: 100%;
  min-height: 60vh;
  display: flex;
  flex-direction: column;
}

.editor-cm-host :deep(.cm-scroller) {
  flex: 1 1 auto;
  overflow: auto;
}

@media (min-width: 768px) {
  .editor-cm-host {
    min-height: calc(100vh - 220px);
    font-size: 1.025rem;
  }

  .editor-cm-host :deep(.cm-editor) {
    min-height: calc(100vh - 220px);
  }

  .editor-cm-host :deep(.cm-content) {
    font-size: 1.025rem;
    padding: 1.5rem 2rem 1rem;
  }
}
</style>
