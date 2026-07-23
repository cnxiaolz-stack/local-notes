<script setup lang="ts">
// 便签主视图：上方搜索框（常驻）+ 便签输入框（主要位置）。
// 列表按需显示：搜索时显示搜索结果；点 header「全部」按钮（app.showAllList）展开全部分页列表；默认不显示列表。
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

const searchKeyword = computed<string>({
  get: () => store.searchKeyword,
  set: (v) => {
    store.searchKeyword = v
  }
})
const searching = computed(() => store.searchKeyword.trim() !== '')

/** 是否展示列表区（搜索或全部展开时） */
const showList = computed(() => searching.value || app.showAllList)

/** 列表展示数据：搜索优先；否则全部展开时分页列表；默认空 */
const displayNotes = computed(() => {
  if (searching.value) return store.searchResults
  if (app.showAllList) return store.pagedNotes
  return []
})

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
  editingNote.value = note
  if (app.showAllList) void store.loadNotesPage(true)
}

function onDeleted(): void {
  editingNote.value = null
  sessionKey.value++
  if (app.showAllList) void store.loadNotesPage(true)
}

function onCloseEditor(): void {
  editingNote.value = null
  sessionKey.value++
}

function setupObserver(): void {
  if (!sentinelEl.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      if (
        entries[0].isIntersecting &&
        app.showAllList &&
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

function teardownObserver(): void {
  observer?.disconnect()
  observer = null
}

// 便签日期集合变化 → 同步全局日历标记
watch(
  () => store.noteDates,
  (dates) => {
    app.setMarkedDates(dates)
  }
)

// 「全部」展开时：首次加载首批 + setup observer；收起时 teardown
watch(
  () => app.showAllList,
  async (open) => {
    if (open) {
      if (store.pagedNotes.length === 0) await store.loadNotesPage(true)
      nextTick(() => {
        teardownObserver()
        setupObserver()
      })
    } else {
      teardownObserver()
    }
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

onBeforeUnmount(() => {
  teardownObserver()
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
      :date="today"
      @created="onCreated"
      @deleted="onDeleted"
      @close="onCloseEditor"
    />

    <!-- 列表区：搜索结果 / 全部分页列表（按需显示） -->
    <div v-if="showList" class="notes-list-area">
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

      <!-- 滚动加载哨兵（仅全部展开且非搜索时生效） -->
      <div v-if="app.showAllList && !searching" ref="sentinelEl" class="sentinel" aria-hidden="true"></div>
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
