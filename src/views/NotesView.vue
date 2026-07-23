<script setup lang="ts">
// 便签主视图：上方搜索框（常驻）+ 便签输入框 + 下方便签列表（默认常显）。
// 列表按日期分组：未归档在前（date 经滚动后多为今天），归档置底（按原日期分组）。
// 选 header 日期 → 滚动到对应日期分组位置（主要用于查看某天归档的便签）。
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useNoteStore } from '@/stores/note'
import { useAppStore } from '@/stores/app'
import type { Note } from '@/types'
import NoteEditor from '@/components/note/NoteEditor.vue'
import SearchBar from '@/components/note/SearchBar.vue'
import { formatCreatedDate, formatModifiedDate } from '@/utils/time'

const store = useNoteStore()
const app = useAppStore()

/** 编辑器会话：sessionKey 变化时编辑器重新挂载；new→edit 切换不变（保持焦点） */
const sessionKey = ref(0)
const editingNote = ref<Note | null>(null)

const searchKeyword = computed<string>({
  get: () => store.searchKeyword,
  set: (v) => {
    store.searchKeyword = v
  }
})
const searching = computed(() => store.searchKeyword.trim() !== '')

/** 列表展示数据：搜索优先；否则默认全部（未归档在前，归档置底） */
const displayNotes = computed(() => {
  if (searching.value) return store.searchResults
  return store.sortedNotes
})

/** 日期分组的标题：今天/昨天/完整日期 */
function dateLabel(date: string): string {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const todayStr = `${y}-${m}-${d}`
  if (date === todayStr) return '今天'
  const yesterday = new Date(y, today.getMonth(), today.getDate() - 1)
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  if (date === yStr) return '昨天'
  const [yy, mm, dd] = date.split('-').map(Number)
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(new Date(yy, (mm || 1) - 1, dd || 1))
  } catch {
    return date
  }
}

/** 按日期 + 归档态分组的结构（用于渲染分组标题与定位） */
const groupedNotes = computed(() => {
  const list = displayNotes.value
  const groups: { key: string; date: string; archived: boolean; notes: Note[] }[] = []
  for (const note of list) {
    // 分组键：归档态 + 日期。未归档与归档即使同一天也分两组（归档置底）。
    const key = `${note.archived ? '1' : '0'}-${note.date}`
    let g = groups.find((x) => x.key === key)
    if (!g) {
      g = { key, date: note.date, archived: note.archived, notes: [] }
      groups.push(g)
    }
    g.notes.push(note)
  }
  return groups
})

/** 便签标题：标题为空时取正文首行，再为空则"无标题" */
function noteTitle(note: Note): string {
  const t = note.title.trim()
  if (t) return t
  const firstLine = note.content
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean)
  return firstLine || '无标题'
}

function handleOpen(note: Note): void {
  sessionKey.value++
  editingNote.value = note
}

function onCreated(): void {
  // 新建后列表自动反映（store.notes 已 push，sortedNotes 计算属性会更新）
}

function onDeleted(): void {
  editingNote.value = null
  sessionKey.value++
}

function onCloseEditor(): void {
  editingNote.value = null
  sessionKey.value++
}

/** 分组容器引用：key=分组键 → el，用于日期跳转滚动 */
const groupRefs = ref<Map<string, HTMLElement>>(new Map())
function setGroupRef(key: string, el: HTMLElement | null): void {
  if (el) groupRefs.value.set(key, el)
  else groupRefs.value.delete(key)
}

/** 选日期 → 滚动到对应分组（优先未归档组，无则归档组） */
function scrollToSelectedDate(date: string): void {
  // 找第一个匹配该日期的分组（未归档优先，因为未归档在前）
  const target = groupedNotes.value.find((g) => g.date === date)
  if (!target) return
  const el = groupRefs.value.get(target.key)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 便签日期集合变化 → 同步全局日历标记
watch(
  () => store.noteDates,
  (dates) => {
    app.setMarkedDates(dates)
  }
)

// 全局选中日期变化 → 滚动到对应分组
watch(
  () => app.selectedDate,
  (date) => {
    nextTick(() => scrollToSelectedDate(date))
  }
)

onMounted(async () => {
  try {
    await store.loadNotes()
  } catch (err) {
    console.error('[qingji] 便签数据加载失败：', err)
  }
  app.setMarkedDates(store.noteDates)
})
</script>

<template>
  <section class="notes-view">
    <!-- 搜索框（常驻顶部，次要位置） -->
    <SearchBar v-model="searchKeyword" />

    <!-- 主要位置：便签输入框（单一，无标题） -->
    <NoteEditor
      :key="sessionKey"
      :note="editingNote"
      :date="app.selectedDate"
      @created="onCreated"
      @deleted="onDeleted"
      @close="onCloseEditor"
    />

    <!-- 便签列表（默认常显，按日期分组） -->
    <div class="notes-list-area">
      <div v-if="displayNotes.length === 0" class="empty-state">
        <svg
          viewBox="0 0 24 24"
          width="36"
          height="36"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <p class="empty-title">
          {{ searching ? '未找到匹配的便签' : '还没有便签' }}
        </p>
        <p class="empty-hint">
          {{ searching ? '试试其他关键词' : '在上方输入框写下第一条吧' }}
        </p>
      </div>

      <template v-else>
        <!-- 搜索结果：平铺，不分日期分组 -->
        <div v-if="searching" class="note-list">
          <button
            v-for="note in displayNotes"
            :key="note.id"
            type="button"
            class="note-row"
            :class="{
              'is-selected': note.id === editingNote?.id,
              'is-archived': note.archived
            }"
            @click="handleOpen(note)"
          >
            <span class="note-row-title">{{ noteTitle(note) }}</span>
            <span class="note-row-meta">
              创建于 {{ formatCreatedDate(note.created_at) }} · 修改 {{ formatModifiedDate(note.updated_at) }}
              <span v-if="note.archived" class="archived-tag">· 已归档</span>
            </span>
          </button>
        </div>

        <!-- 默认列表：按日期分组 -->
        <div v-else>
          <div
            v-for="group in groupedNotes"
            :key="group.key"
            :ref="(el) => setGroupRef(group.key, el as HTMLElement)"
            class="note-group"
          >
            <div class="note-group-header">
              <span class="note-group-date">{{ dateLabel(group.date) }}</span>
              <span v-if="group.archived" class="note-group-archived">已归档</span>
            </div>
            <div class="note-list">
              <button
                v-for="note in group.notes"
                :key="note.id"
                type="button"
                class="note-row"
                :class="{
                  'is-selected': note.id === editingNote?.id,
                  'is-archived': note.archived
                }"
                @click="handleOpen(note)"
              >
                <span class="note-row-title">{{ noteTitle(note) }}</span>
                <span class="note-row-meta">
                  创建于 {{ formatCreatedDate(note.created_at) }} · 修改 {{ formatModifiedDate(note.updated_at) }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.notes-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 列表区 */
.notes-list-area {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.note-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  scroll-margin-top: 80px;
}

.note-group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.25rem;
}

.note-group-date {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.note-group-archived {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-soft);
  padding: 0.125rem 0.4rem;
  border-radius: 9999px;
}

.note-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.note-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
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
.note-row:hover {
  border-color: var(--color-brand);
}
.note-row:active {
  transform: scale(0.99);
}
.note-row.is-selected {
  border-color: var(--color-brand);
  background-color: var(--color-brand-soft);
}
.note-row.is-archived {
  opacity: 0.62;
}

.note-row-title {
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.note-row-meta {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  opacity: 0.8;
}
.archived-tag {
  opacity: 0.85;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
  padding: 2rem 1rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  text-align: center;
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
</style>
