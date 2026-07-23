// 便签 store（Pinia setup 风格）
// 关键行为：
// 1. 空内容不保存：新建不入库，输入后才落库；已落库的清空后删除（由编辑器层判定并调用 create/update/delete）
// 2. 归档：归档后置底；列表展示时归档项透明度降低
// 3. 未归档滚动：加载时把 date < 今天 的未归档便签滚动到今天，满足"未归档一直显示当天"
// 4. 默认列表：进页即展示全部便签（未归档在前按日期分组，归档置底按原日期分组）
// 5. 搜索：关键字非空时全量内存过滤
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Note } from '@/types'
import { getStorage } from '@/utils/storage'
import { todayStr } from '@/utils/time'

export const useNoteStore = defineStore('note', () => {
  /** 全部便签（全量内存，供默认列表/搜索/日历标记） */
  const notes = ref<Note[]>([])
  /** 搜索关键字（搜索时全量内存过滤） */
  const searchKeyword = ref<string>('')

  /** 搜索结果（关键字非空时全量内存过滤；未归档在前，归档置底） */
  const searchResults = computed(() => {
    const kw = searchKeyword.value.trim().toLowerCase()
    if (!kw) return []
    return notes.value
      .filter(
        (n) =>
          n.title.toLowerCase().includes(kw) ||
          n.content.toLowerCase().includes(kw)
      )
      .sort((a, b) => {
        if (a.archived !== b.archived) return a.archived ? 1 : -1
        return b.updated_at - a.updated_at
      })
  })

  /**
   * 默认列表展示数据（未搜索时）：
   * - 未归档在前（按 updated_at DESC），归档置底（按 updated_at DESC）
   * - 滚动加载由视图层 IntersectionObserver 控制（首批 100 条，触底再加载下一批）
   */
  const sortedNotes = computed(() => {
    return [...notes.value].sort((a, b) => {
      if (a.archived !== b.archived) return a.archived ? 1 : -1
      return b.updated_at - a.updated_at
    })
  })

  /** 有便签的日期集合（用于全局日历标记，含未归档+归档） */
  const noteDates = computed(() => {
    const set = new Set(notes.value.map((n) => n.date))
    return Array.from(set).sort()
  })

  /** 加载全量便签（供默认列表/搜索/日历标记），并把过去日期的未归档便签滚动到今天 */
  async function loadNotes(): Promise<void> {
    notes.value = await getStorage().getAllNotes()
    await rolloverToToday()
  }

  /** 把 date < 今天的未归档便签滚动到今天（满足"未归档一直显示当天"） */
  async function rolloverToToday(): Promise<void> {
    const today = todayStr()
    const stale = notes.value.filter((n) => !n.archived && n.date < today)
    for (const n of stale) {
      const updated = await getStorage().updateNote(n.id, { date: today })
      const idx = notes.value.findIndex((x) => x.id === n.id)
      if (idx !== -1) notes.value[idx] = updated
    }
  }

  /** 新建便签（落库，由编辑器在内容非空时调用） */
  async function createNote(data: {
    title: string
    content: string
    date: string
  }): Promise<Note> {
    const created = await getStorage().createNote({
      title: data.title,
      content: data.content,
      date: data.date,
      archived: false,
      archived_at: null
    })
    notes.value.push(created)
    return created
  }

  /** 更新便签（局部字段） */
  async function updateNote(id: string, patch: Partial<Note>): Promise<Note> {
    const updated = await getStorage().updateNote(id, patch)
    const idx = notes.value.findIndex((n) => n.id === id)
    if (idx !== -1) notes.value[idx] = updated
    return updated
  }

  /** 删除便签 */
  async function deleteNote(id: string): Promise<void> {
    await getStorage().deleteNote(id)
    notes.value = notes.value.filter((n) => n.id !== id)
  }

  /** 归档便签 */
  async function archiveNote(id: string): Promise<Note> {
    return updateNote(id, { archived: true, archived_at: Date.now() })
  }

  /** 取消归档 */
  async function unarchiveNote(id: string): Promise<Note> {
    return updateNote(id, { archived: false, archived_at: null })
  }

  return {
    notes,
    searchKeyword,
    sortedNotes,
    searchResults,
    noteDates,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    archiveNote,
    unarchiveNote
  }
})
