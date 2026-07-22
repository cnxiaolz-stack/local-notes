// 便签 store（Pinia setup 风格）
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Note } from '@/types'
import { getStorage } from '@/utils/storage'

export const useNoteStore = defineStore('note', () => {
  /** 全部便签（按 updated_at 降序） */
  const notes = ref<Note[]>([])
  /** 搜索关键字 */
  const searchKeyword = ref<string>('')

  /** 按关键字过滤后的便签（匹配标题或正文，不区分大小写） */
  const filteredNotes = computed<Note[]>(() => {
    const kw = searchKeyword.value.trim().toLowerCase()
    const list = kw
      ? notes.value.filter(
          (n) =>
            n.title.toLowerCase().includes(kw) ||
            n.content.toLowerCase().includes(kw)
        )
      : notes.value.slice()
    return list.sort((a, b) => b.updated_at - a.updated_at)
  })

  /** 加载全部便签 */
  async function loadNotes(): Promise<void> {
    notes.value = await getStorage().getAllNotes()
  }

  /** 新建空白便签 */
  async function addNote(): Promise<Note> {
    const created = await getStorage().createNote({ title: '', content: '' })
    notes.value.unshift(created)
    return created
  }

  /** 更新便签（局部字段） */
  async function updateNote(id: string, patch: Partial<Note>): Promise<void> {
    const updated = await getStorage().updateNote(id, patch)
    const idx = notes.value.findIndex((n) => n.id === id)
    if (idx !== -1) notes.value[idx] = updated
  }

  /** 删除便签 */
  async function deleteNote(id: string): Promise<void> {
    await getStorage().deleteNote(id)
    notes.value = notes.value.filter((n) => n.id !== id)
  }

  return {
    notes,
    searchKeyword,
    filteredNotes,
    loadNotes,
    addNote,
    updateNote,
    deleteNote
  }
})
