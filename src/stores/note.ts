// 便签 store（Pinia setup 风格）
// 关键行为：
// 1. 空内容不保存：新建不入库，输入后才落库；已落库的清空后删除（由编辑器层判定并调用 create/update/delete）
// 2. 归档：归档后置底；列表展示时归档项透明度降低
// 3. 未归档滚动：加载时把 date < 今天 的未归档便签滚动到今天，满足"未归档一直显示当天"
// 4. 列表分页：按 updated_at DESC 滚动加载（100 条/批）；搜索时全量内存过滤
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Note } from '@/types'
import { getStorage } from '@/utils/storage'
import { todayStr } from '@/utils/time'

/** 分页每批数量 */
const PAGE_SIZE = 100

export const useNoteStore = defineStore('note', () => {
  /** 全部便签（全量内存，供搜索过滤与日历日期标记） */
  const notes = ref<Note[]>([])
  /** 搜索关键字（搜索时全量内存过滤；为空时列表用分页） */
  const searchKeyword = ref<string>('')

  /** 分页列表（按 updated_at DESC） */
  const pagedNotes = ref<Note[]>([])
  const notesOffset = ref<number>(0)
  const notesHasMore = ref<boolean>(true)
  const notesLoading = ref<boolean>(false)

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

  /** 有便签的日期集合（用于全局日历标记） */
  const noteDates = computed(() => {
    const set = new Set(notes.value.map((n) => n.date))
    return Array.from(set).sort()
  })

  /** 加载全量便签（供搜索/日历标记），并把过去日期的未归档便签滚动到今天 */
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

  /** 加载分页便签列表；reset=true 时重置从头加载 */
  async function loadNotesPage(reset = false): Promise<void> {
    if (notesLoading.value) return
    if (reset) {
      pagedNotes.value = []
      notesOffset.value = 0
      notesHasMore.value = true
    }
    if (!notesHasMore.value) return
    notesLoading.value = true
    try {
      const batch = await getStorage().getNotesPage(PAGE_SIZE, notesOffset.value)
      pagedNotes.value = reset ? batch : [...pagedNotes.value, ...batch]
      notesOffset.value += batch.length
      notesHasMore.value = batch.length === PAGE_SIZE
    } catch (err) {
      console.error('[qingji] 加载便签分页失败：', err)
    } finally {
      notesLoading.value = false
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
    pagedNotes,
    notesHasMore,
    notesLoading,
    searchResults,
    noteDates,
    loadNotes,
    loadNotesPage,
    createNote,
    updateNote,
    deleteNote,
    archiveNote,
    unarchiveNote
  }
})
