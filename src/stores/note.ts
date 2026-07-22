// 便签 store（Pinia setup 风格）
// 关键行为：
// 1. 空内容不保存：新建不入库，输入后才落库；已落库的清空后删除（由编辑器层判定并调用 create/update/delete）
// 2. 归档：归档后置底，次日不再显示（当日列表只取 date===当日 的归档项）
// 3. 未归档滚动：加载时把 date < 今天 的未归档便签滚动到今天，满足"未归档一直显示当天"
// 4. 按月分组浏览：全部便签按 date 的年月分组
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Note } from '@/types'
import { getStorage } from '@/utils/storage'
import { todayStr } from '@/utils/time'

export const useNoteStore = defineStore('note', () => {
  /** 全部便签 */
  const notes = ref<Note[]>([])
  /** 搜索关键字（仅用于"全部"浏览模式过滤） */
  const searchKeyword = ref<string>('')

  /** 当日未归档便签（按 created_at 升序） */
  function dayActive(date: string): Note[] {
    return notes.value
      .filter((n) => n.date === date && !n.archived)
      .sort((a, b) => a.created_at - b.created_at)
  }

  /** 当日已归档便签（按 archived_at 升序） */
  function dayArchived(date: string): Note[] {
    return notes.value
      .filter((n) => n.date === date && n.archived)
      .sort((a, b) => (a.archived_at ?? 0) - (b.archived_at ?? 0))
  }

  /** 全部便签按月分组（受搜索关键字过滤；未归档在前，归档置底；组内按 updated_at 降序） */
  const groupedByMonth = computed(() => {
    const kw = searchKeyword.value.trim().toLowerCase()
    const filtered = kw
      ? notes.value.filter(
          (n) =>
            n.title.toLowerCase().includes(kw) ||
            n.content.toLowerCase().includes(kw)
        )
      : notes.value.slice()
    const sorted = [...filtered].sort((a, b) => {
      if (a.archived !== b.archived) return a.archived ? 1 : -1
      return b.updated_at - a.updated_at
    })
    const groups: { month: string; label: string; items: Note[] }[] = []
    for (const n of sorted) {
      const month = n.date.slice(0, 7)
      let g = groups.find((x) => x.month === month)
      if (!g) {
        const [y, m] = month.split('-').map(Number)
        g = {
          month,
          label: new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: 'long'
          }).format(new Date(y, (m || 1) - 1, 1)),
          items: []
        }
        groups.push(g)
      }
      g.items.push(n)
    }
    return groups
  })

  /** 有便签的日期集合（用于全局日历标记） */
  const noteDates = computed(() => {
    const set = new Set(notes.value.map((n) => n.date))
    return Array.from(set).sort()
  })

  /** 加载全部便签，并把过去日期的未归档便签滚动到今天 */
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
    dayActive,
    dayArchived,
    groupedByMonth,
    noteDates,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    archiveNote,
    unarchiveNote
  }
})
