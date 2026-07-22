<script setup lang="ts">
// 便签主视图：上方输入（主要位置）+ 下方全部便签列表（滚动加载）。
// 搜索为次要动作（右上图标按钮展开），搜索时全量内存过滤。
// 便签列表恒为全部（按 updated_at DESC），不再按日期过滤。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useNoteStore } from '@/stores/note'
import { useAppStore } from '@/stores/app'
import type { Note } from '@/types'
import NoteEditor from '@/components/note/NoteEditor.vue'
import SearchBar from '@/components/note/SearchBar.vue'
import { formatRelative, todayStr } from '@/utils/time'

const store = useNoteStore()
const app = useAppStore()

const today = todayStr()

/** 编辑器会话：sessionKey 变化时编辑器重新挂载；new→edit 切换不变（保持焦点） */
const sessionKey = ref(0)
const editingNote = ref<Note | null>(null)

/** 搜索框展开态（次要动作，默认收起） */
const searchOpen = ref(false)
const searchKeyword = computed<string>({
  get: () => store.searchKeyword,
  set: (v) => {
    store.searchKeyword = v
  }
})
const searching = computed(() => store.searchKeyword.trim() !== '')

/** 列表展示数据：搜索时用全量内存过滤结果，否则用分页列表 */
const displayNotes = computed(() =>
  searching.value ? store.searchResults : store.pagedNotes
)

/** 滚动加载哨兵 */
const sentinelEl = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null

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

function noteUpdatedLabel(note: Note): string {
  return formatRelative(note.updated_at)
}

function handleOpen(note: Note): void {
  sessionKey.value++
  editingNote.value = note
}

function onCreated(note: Note): void {
  // 草稿落库：切换为编辑该便签，不改变 sessionKey（保持编辑器挂载与焦点）
  editingNote.value = note
  void store.loadNotesPage(true)
}

function onDeleted(): void {
  editingNote.value = null
  sessionKey.value++
  void store.loadNotesPage(true)
}

function onCloseEditor(): void {
  editingNote.value = null
  sessionKey.value++
}

function openSearch(): void {
  searchOpen.value = true
  nextTick(() => {
    document.querySelector<HTMLInputElement>('.notes-view .search-input')?.focus()
  })
}

function closeSearch(): void {
  searchOpen.value = false
  store.searchKeyword = ''
}

function setupObserver(): void {
  if (!sentinelEl.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      if (
        entries[0].isIntersecting &&
        !searching.value &&
        store.notesHasMore &&
        !store.notesLoading
      ) {
        void store.loadNotesPage()
      }
    },
    { root: null, rootMargin: '200px' }
  )
  observer.observe(sentinelEl.value)
}

// 便签日期集合变化 → 同步全局日历标记
watch(
  () => store.noteDates,
  (dates) => {
    app.setMarkedDates(dates)
  }
)

onMounted(async () => {
  try {
    await Promise.all([store.loadNotes(), store.loadNotesPage(true)])
  } catch (err) {
    console.error('[qingji] 便签数据加载失败：', err)
  }
  app.setMarkedDates(store.noteDates)
  nextTick(() => setupObserver())
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <section class="notes-view">
    <!-- 顶部工具栏：搜索（次要，右上） -->
    <div class="notes-toolbar">
      <div v-if="searchOpen" class="search-wrap">
        <SearchBar v-model="searchKeyword" />
        <button
          type="button"
          class="icon-btn"
          aria-label="关闭搜索"
          @click="closeSearch"
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
      <button
        v-else
        type="button"
        class="icon-btn search-toggle"
        aria-label="搜索便签"
        @click="openSearch"
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
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </div>

    <!-- 主要位置：便签输入框（单一，无标题） -->
    <NoteEditor
      :key="sessionKey"
      :note="editingNote"
      :date="today"
      @created="onCreated"
      @deleted="onDeleted"
      @close="onCloseEditor"
    />

    <!-- 下方：全部便签列表（滚动加载） -->
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

      <div v-else class="note-list">
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
            修改于 {{ noteUpdatedLabel(note) }}
            <span v-if="note.archived" class="archived-tag">· 已归档</span>
          </span>
        </button>
      </div>

      <!-- 滚动加载哨兵 -->
      <div ref="sentinelEl" class="sentinel" aria-hidden="true"></div>
      <div v-if="searching" class="load-hint">
        共 {{ displayNotes.length }} 条匹配
      </div>
      <div v-else-if="store.notesLoading" class="load-hint">加载中…</div>
      <div v-else-if="!store.notesHasMore && displayNotes.length > 0" class="load-hint">
        没有更多了
      </div>
    </div>
  </section>
</template>

<style scoped>
.notes-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notes-toolbar {
  display: flex;
  justify-content: flex-end;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}
.search-wrap :deep(.search-bar) {
  flex: 1 1 0%;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 200ms ease, border-color 200ms ease, background-color 200ms ease,
    transform 120ms ease;
}
.icon-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-brand);
}
.icon-btn:active {
  transform: scale(0.94);
}
.search-toggle {
  margin-left: auto;
}

/* 列表区 */
.notes-list-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

.sentinel {
  height: 1px;
  width: 100%;
}

.load-hint {
  text-align: center;
  padding: 0.75rem 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
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
