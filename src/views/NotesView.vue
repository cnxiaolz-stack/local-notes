<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useNoteStore } from '@/stores/note'
import type { Note } from '@/types'
import NoteCard from '@/components/note/NoteCard.vue'
import NoteEditor from '@/components/note/NoteEditor.vue'
import SearchBar from '@/components/note/SearchBar.vue'

const store = useNoteStore()

const editingId = ref<string | null>(null)

const editingNote = computed<Note | null>(() => {
  if (!editingId.value) return null
  return store.notes.find((n) => n.id === editingId.value) ?? null
})

const totalCount = computed(() => store.notes.length)
const isEmpty = computed(() => store.notes.length === 0)
const hasNoResults = computed(
  () => !isEmpty.value && store.filteredNotes.length === 0
)

const searchKeyword = computed<string>({
  get: () => store.searchKeyword,
  set: (v) => {
    store.searchKeyword = v
  }
})

async function handleNew(): Promise<void> {
  const created = await store.addNote()
  editingId.value = created.id
}

function handleOpen(note: Note): void {
  editingId.value = note.id
}

function handleBack(): void {
  editingId.value = null
}

function handleDeleted(): void {
  editingId.value = null
}

onMounted(() => {
  void store.loadNotes()
})
</script>

<template>
  <section class="mx-auto max-w-4xl">
    <!-- 编辑态 -->
    <NoteEditor
      v-if="editingNote"
      :key="editingNote.id"
      :note="editingNote"
      @back="handleBack"
      @deleted="handleDeleted"
    />

    <!-- 列表态 -->
    <template v-else>
      <!-- 顶部：标题 + 新建按钮 -->
      <div class="notes-header">
        <div class="notes-title-wrap">
          <h2 class="notes-title">便签</h2>
          <span v-if="totalCount > 0" class="notes-count">{{ totalCount }} 条</span>
        </div>
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
      </div>

      <!-- 搜索框 -->
      <SearchBar v-model="searchKeyword" class="mt-4" />

      <!-- 空状态：无便签 -->
      <div v-if="isEmpty" class="empty-state">
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
        <p class="empty-title">还没有便签</p>
        <p class="empty-hint">点击右上角"新建"开始记录</p>
      </div>

      <!-- 搜索无结果 -->
      <div v-else-if="hasNoResults" class="empty-state">
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
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <p class="empty-title">未找到匹配的便签</p>
        <p class="empty-hint">试试其他关键词</p>
      </div>

      <!-- 卡片网格 -->
      <div v-else class="notes-grid">
        <NoteCard
          v-for="note in store.filteredNotes"
          :key="note.id"
          :note="note"
          :keyword="store.searchKeyword"
          @open="handleOpen(note)"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.notes-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.notes-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-text-primary);
}
.notes-count {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.new-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 36px;
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

.notes-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-top: 1.25rem;
}
@media (min-width: 640px) {
  .notes-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .notes-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding: 3rem 1.5rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  text-align: center;
}
.empty-title {
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
.empty-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}
</style>
