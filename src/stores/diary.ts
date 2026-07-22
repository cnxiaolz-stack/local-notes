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

  /** 加载指定日期的日记 */
  async function loadDiary(date: string): Promise<void> {
    currentDiary.value = await getStorage().getDiary(date)
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
    }
  }

  return {
    currentDiary,
    diaryDates,
    pagedDiaries,
    diariesHasMore,
    diariesLoading,
    loadDiary,
    saveDiary,
    deleteDiary,
    loadDiaryDates,
    loadDiariesPage
  }
})
