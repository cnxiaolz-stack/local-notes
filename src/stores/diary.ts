// 日记 store（Pinia setup 风格）
// 关键行为：
// 1. 一天一篇：loadDiary(date) 取当天日记，无则 null
// 2. 列表分页：按 date DESC 滚动加载（100 篇/批）；日历标记用 loadDiaryDates() 全量取日期
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Diary } from '@/types'
import { getStorage } from '@/utils/storage'

/** 分页每批数量 */
const PAGE_SIZE = 100

export const useDiaryStore = defineStore('diary', () => {
  /** 当前查看的日记（一天一篇，无则为 null） */
  const currentDiary = ref<Diary | null>(null)
  /** 已有日记的日期集合（YYYY-MM-DD，供全局日历标记） */
  const diaryDates = ref<string[]>([])

  /** 分页列表（按 date DESC） */
  const pagedDiaries = ref<Diary[]>([])
  const diariesOffset = ref<number>(0)
  const diariesHasMore = ref<boolean>(true)
  const diariesLoading = ref<boolean>(false)
  /** 分页列表是否至少完整加载过一批（浏览层用，不能以 length 判断——可能有乐观条目） */
  const pagedLoadedOnce = ref<boolean>(false)

  /** 有刚从编辑器提交、尚未完成落盘草稿的日期（内存内容领先于数据库时的标记） */
  const pendingDraftDate = ref<string | null>(null)

  /** 加载指定日期的日记 */
  async function loadDiary(date: string): Promise<void> {
    currentDiary.value = await getStorage().getDiary(date)
  }

  /**
   * 同步提交编辑器草稿到内存（不落盘）。
   * 编辑器卸载（进入浏览模式/切换日期）时调用：浏览层与编辑器重挂载
   * 立即可见最新内容，不受异步落盘竞态影响（直接读库会拿到旧值）。
   * 落盘由 persistDiary 异步负责。
   */
  function commitDraft(date: string, content: string): void {
    const isEmpty = content.trim() === ''
    const now = Date.now()
    if (isEmpty) {
      // 清空：同步移除内存记录与日期标记
      if (currentDiary.value?.date === date) currentDiary.value = null
      diaryDates.value = diaryDates.value.filter((d) => d !== date)
      const idx = pagedDiaries.value.findIndex((d) => d.date === date)
      if (idx >= 0) pagedDiaries.value.splice(idx, 1)
      pendingDraftDate.value = date
      return
    }
    const base = currentDiary.value?.date === date ? currentDiary.value : null
    const committed: Diary = base
      ? { ...base, content, updated_at: now }
      : { date, content, created_at: now, updated_at: now }
    currentDiary.value = committed
    if (!diaryDates.value.includes(date)) {
      diaryDates.value = [...diaryDates.value, date]
    }
    const idx = pagedDiaries.value.findIndex((d) => d.date === date)
    if (idx >= 0) {
      pagedDiaries.value[idx] = committed
    } else {
      // 列表未含该日期（新写的第一篇）：按 date DESC 插入合适位置
      const insertAt = pagedDiaries.value.findIndex((d) => d.date < date)
      if (insertAt >= 0) pagedDiaries.value.splice(insertAt, 0, committed)
      else pagedDiaries.value.push(committed)
      // 乐观插入使列表多一条，同步偏移避免下批分页重复
      diariesOffset.value++
    }
    pendingDraftDate.value = date
  }

  /**
   * 落盘编辑器卸载时提交的草稿（commitDraft 已同步内存）。
   * 与 saveDiary 的区别：不把 currentDiary 强制覆盖为落盘结果
   * （浏览层可能已切换到其他日期），仅在内容被在途保存覆盖回旧值时校正。
   */
  async function persistDiary(date: string, content: string): Promise<void> {
    const isEmpty = content.trim() === ''
    let saved: Diary | null = null
    try {
      if (isEmpty) {
        await getStorage().deleteDiary(date)
      } else {
        saved = await getStorage().upsertDiary({ date, content })
      }
    } catch (err) {
      console.error('[qingji] 日记草稿落盘失败：', err)
    } finally {
      // 清除待落盘标记（仅当仍指向本次日期，避免误清后续新草稿）
      if (pendingDraftDate.value === date) pendingDraftDate.value = null
      // 兜底：在途的普通保存可能把 currentDiary 覆盖回较旧内容，校正为本次最新
      if (saved && currentDiary.value?.date === date &&
          currentDiary.value.content !== saved.content) {
        currentDiary.value = saved
      }
    }
  }

  /** 保存（新建或更新）指定日期的日记 */
  async function saveDiary(date: string, content: string): Promise<Diary> {
    const saved = await getStorage().upsertDiary({ date, content })
    currentDiary.value = saved
    if (!diaryDates.value.includes(date)) {
      diaryDates.value = [...diaryDates.value, date]
    }
    return saved
  }

  /** 删除指定日期的日记（清空内容时调用，同步移除日期标记与列表） */
  async function deleteDiary(date: string): Promise<void> {
    await getStorage().deleteDiary(date)
    currentDiary.value = null
    diaryDates.value = diaryDates.value.filter((d) => d !== date)
  }

  /** 加载所有已存在日记的日期列表（全量，供日历标记） */
  async function loadDiaryDates(): Promise<void> {
    const all = await getStorage().getAllDiaries()
    diaryDates.value = all.map((d) => d.date)
  }

  /** 加载分页日记列表；reset=true 时重置从头加载 */
  async function loadDiariesPage(reset = false): Promise<void> {
    if (diariesLoading.value) return
    if (reset) {
      pagedDiaries.value = []
      diariesOffset.value = 0
      diariesHasMore.value = true
    }
    if (!diariesHasMore.value) return
    diariesLoading.value = true
    try {
      const batch = await getStorage().getDiariesPage(PAGE_SIZE, diariesOffset.value)
      pagedDiaries.value = reset ? batch : [...pagedDiaries.value, ...batch]
      diariesOffset.value += batch.length
      diariesHasMore.value = batch.length === PAGE_SIZE
    } catch (err) {
      console.error('[qingji] 加载日记分页失败：', err)
    } finally {
      diariesLoading.value = false
      pagedLoadedOnce.value = true
    }
  }

  return {
    currentDiary,
    diaryDates,
    pagedDiaries,
    diariesHasMore,
    diariesLoading,
    pagedLoadedOnce,
    pendingDraftDate,
    loadDiary,
    saveDiary,
    deleteDiary,
    loadDiaryDates,
    loadDiariesPage,
    commitDraft,
    persistDiary
  }
})
