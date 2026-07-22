<script setup lang="ts">
// 便签主视图：左侧列表（当日视图 / 全部按月分组）+ 右侧内联编辑区。
// 日期由全局 header 的日历按钮驱动（app.selectedDate）。
import { computed, onMounted, ref, watch } from 'vue'
import { useNoteStore } from '@/stores/note'
import { useAppStore } from '@/stores/app'
import type { Note } from '@/types'
import NoteEditor from '@/components/note/NoteEditor.vue'
import SearchBar from '@/components/note/SearchBar.vue'
import { formatRelative } from '@/utils/time'

const store = useNoteStore()
const app = useAppStore()

type ListMode = 'day' | 'all'
const listMode = ref<ListMode>('day')

/** 编辑器会话：sessionKey 变化时编辑器重新挂载；new→edit 切换不变（保持焦点） */
const sessionKey = ref(0)
const editingNote = ref<Note | null>(null)
const isNew = ref(false)
const showEditor = computed(() => isNew.value || editingNote.value !== null)
const editingId = computed(() => editingNote.value?.id ?? null)

const activeNotes = computed(() => store.dayActive(app.selectedDate))
const archivedNotes = computed(() => store.dayArchived(app.selectedDate))
const monthGroups = computed(() => store.groupedByMonth)
const isEmpty = computed(() => store.notes.length === 0)

const searchKeyword = computed<string>({
  get: () => store.searchKeyword,
  set: (v) => {
    store.searchKeyword = v
  }
})

function matchesSearch(note: Note): boolean {
  const kw = store.searchKeyword.trim().toLowerCase()
  if (!kw) return true
  return (
    note.title.toLowerCase().includes(kw) ||
    note.content.toLowerCase().includes(kw)
  )
}

const filteredActive = computed(() => activeNotes.value.filter(matchesSearch))
const filteredArchived = computed(() =>
  archivedNotes.value.filter(matchesSearch)
)
const hasNoResults = computed(
  () =>
    !isEmpty.value &&
    filteredActive.value.length === 0 &&
    filteredArchived.value.length === 0
)
const hasNoAllResults = computed(
  () => !isEmpty.value && monthGroups.value.length === 0
)

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

/** 便签修改时间相对标签 */
function noteUpdatedLabel(note: Note): string {
  return formatRelative(note.updated_at)
}

function handleNew(): void {
  sessionKey.value++
  editingNote.value = null
  isNew.value = true
}

function handleOpen(note: Note): void {
  sessionKey.value++
  editingNote.value = note
  isNew.value = false
}

function onCreated(note: Note): void {
  // 草稿落库：切换为编辑该便签，不改变 sessionKey（保持编辑器挂载与焦点）
  editingNote.value = note
  isNew.value = false
}

function onDeleted(): void {
  editingNote.value = null
  isNew.value = false
}

function onCloseEditor(): void {
  editingNote.value = null
  isNew.value = false
}

// 全局日期变化 → 关闭编辑器（编辑器卸载时会 flushSave 落库草稿）
watch(
  () => app.selectedDate,
  () => {
    editingNote.value = null
    isNew.value = false
  }
)

// 便签日期集合变化 → 同步全局日历标记
watch(
  () => store.noteDates,
  (dates) => {
    app.setMarkedDates(dates)
  }
)

onMounted(async () => {
  await store.loadNotes()
  app.setMarkedDates(store.noteDates)
})
</script>

<template>
  <section class="notes-view">
    <div class="notes-layout">
      <!-- 左侧：列表区（移动端编辑时隐藏） -->
      <aside class="notes-sidebar" :class="{ 'is-hidden-mobile': showEditor }">
        <!-- 顶部：新建按钮 -->
        <button type="button" class="new-btn" @click="handleNew">
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>新建</span>
        </button>

        <!-- 模式切换：当日 / 全部 -->
        <div class="mode-toggle" role="tablist" aria-label="便签列表模式">
          <button
            type="button"
            role="tab"
            :aria-selected="listMode === 'day'"
            :class="['mode-btn', { 'is-active': listMode === 'day' }]"
            @click="listMode = 'day'"
          >
            当日
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="listMode === 'all'"
            :class="['mode-btn', { 'is-active': listMode === 'all' }]"
            @click="listMode = 'all'"
          >
            全部
          </button>
        </div>

        <SearchBar v-model="searchKeyword" class="mt-3" />

        <div class="sidebar-scroll">
          <!-- 空状态：无任何便签 -->
          <div v-if="isEmpty" class="empty-state">
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
            <p class="empty-title">还没有便签</p>
            <p class="empty-hint">点击上方"新建"开始记录</p>
          </div>

          <!-- 当日视图 -->
          <template v-else-if="listMode === 'day'">
            <div v-if="hasNoResults" class="empty-state">
              <p class="empty-title">未找到匹配的便签</p>
              <p class="empty-hint">试试其他关键词</p>
            </div>
            <div
              v-else-if="filteredActive.length === 0 && filteredArchived.length === 0"
              class="empty-state"
            >
              <p class="empty-title">这一天还没有便签</p>
              <p class="empty-hint">点击"新建"添加一条</p>
            </div>
            <template v-else>
              <div v-if="filteredActive.length > 0" class="note-list">
                <button
                  v-for="note in filteredActive"
                  :key="note.id"
                  type="button"
                  class="note-row"
                  :class="{
                    'is-selected': note.id === editingId,
                    'is-archived': note.archived
                  }"
                  @click="handleOpen(note)"
                >
                  <span class="note-row-title">{{ noteTitle(note) }}</span>
                  <span class="note-row-meta">修改于 {{ noteUpdatedLabel(note) }}</span>
                </button>
              </div>
              <div v-if="filteredArchived.length > 0" class="archived-divider">
                已归档
              </div>
              <div v-if="filteredArchived.length > 0" class="note-list">
                <button
                  v-for="note in filteredArchived"
                  :key="note.id"
                  type="button"
                  class="note-row is-archived"
                  :class="{ 'is-selected': note.id === editingId }"
                  @click="handleOpen(note)"
                >
                  <span class="note-row-title">{{ noteTitle(note) }}</span>
                  <span class="note-row-meta">修改于 {{ noteUpdatedLabel(note) }}</span>
                </button>
              </div>
            </template>
          </template>

          <!-- 全部按月分组视图 -->
          <template v-else>
            <div v-if="hasNoAllResults" class="empty-state">
              <p class="empty-title">未找到匹配的便签</p>
              <p class="empty-hint">试试其他关键词</p>
            </div>
            <template v-else>
              <template v-for="group in monthGroups" :key="group.month">
                <div class="month-label">{{ group.label }}</div>
                <div class="note-list">
                  <button
                    v-for="note in group.items"
                    :key="note.id"
                    type="button"
                    class="note-row"
                    :class="{
                      'is-selected': note.id === editingId,
                      'is-archived': note.archived
                    }"
                    @click="handleOpen(note)"
                  >
                    <span class="note-row-title">{{ noteTitle(note) }}</span>
                    <span class="note-row-meta">修改于 {{ noteUpdatedLabel(note) }}</span>
                  </button>
                </div>
              </template>
            </template>
          </template>
        </div>
      </aside>

      <!-- 右侧：编辑区（移动端未编辑时隐藏） -->
      <div class="notes-main" :class="{ 'is-hidden-mobile': !showEditor }">
        <NoteEditor
          v-if="showEditor"
          :key="sessionKey"
          :note="editingNote"
          :date="app.selectedDate"
          @created="onCreated"
          @deleted="onDeleted"
          @close="onCloseEditor"
        />
        <div v-else class="editor-placeholder">
          <svg
            viewBox="0 0 24 24"
            width="40"
            height="40"
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
          <p class="placeholder-title">选择一个便签查看</p>
          <p class="placeholder-hint">或点击左侧"新建"写一条</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.notes-view {
  display: flex;
  flex-direction: column;
}

.notes-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
@media (min-width: 768px) {
  .notes-layout {
    flex-direction: row;
    align-items: flex-start;
  }
}

/* 左侧列表区 */
.notes-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  width: 100%;
}
@media (min-width: 768px) {
  .notes-sidebar {
    width: 340px;
    flex-shrink: 0;
    max-height: calc(100vh - 9rem);
    padding: 0.25rem;
  }
}

.new-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 38px;
  padding: 0 0.875rem;
  border-radius: 0.5rem;
  border: none;
  background-color: var(--color-brand);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: filter 200ms ease, transform 120ms ease;
}
.new-btn:hover {
  filter: brightness(0.92);
}
.new-btn:active {
  transform: scale(0.96);
}

.mode-toggle {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 0.5rem;
  background-color: var(--color-bg-soft);
  border: 1px solid var(--color-border-subtle);
  align-self: flex-start;
}
.mode-btn {
  min-height: 28px;
  padding: 0 0.875rem;
  border-radius: 0.375rem;
  border: none;
  background-color: transparent;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 200ms ease, background-color 200ms ease;
}
.mode-btn.is-active {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  box-shadow: var(--glass-shadow);
}

.sidebar-scroll {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  padding-right: 0.125rem;
  min-height: 4rem;
}
@media (min-width: 768px) {
  .sidebar-scroll {
    flex: 1 1 auto;
    min-height: 0;
  }
}

/* 便签列表项（紧凑） */
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

.archived-divider {
  margin: 0.625rem 0 0.25rem;
  padding: 0 0.25rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  color: var(--color-text-secondary);
}

.month-label {
  margin: 0.875rem 0 0.25rem;
  padding: 0 0.25rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  color: var(--color-text-secondary);
}
.month-label:first-child {
  margin-top: 0;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 1rem;
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

/* 右侧编辑区 */
.notes-main {
  flex: 1 1 0%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
@media (min-width: 768px) {
  .notes-main {
    min-height: calc(100vh - 9rem);
  }
}

.editor-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 1.5rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  border: 1px dashed var(--color-border);
  color: var(--color-text-secondary);
  text-align: center;
  min-height: 16rem;
}
.placeholder-title {
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
.placeholder-hint {
  margin: 0;
  font-size: 0.85rem;
}

/* 移动端：编辑器与列表互斥显示 */
.is-hidden-mobile {
  display: none;
}
@media (min-width: 768px) {
  .is-hidden-mobile {
    display: flex;
  }
}
</style>
