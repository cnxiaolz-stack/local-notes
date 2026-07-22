// 日记 store（Pinia setup 风格）
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Diary } from '@/types'
import { getStorage } from '@/utils/storage'

export const useDiaryStore = defineStore('diary', () => {
  /** 当前查看的日记（一天一篇，无则为 null） */
  const currentDiary = ref<Diary | null>(null)
  /** 已有日记的日期集合（YYYY-MM-DD） */
  const diaryDates = ref<string[]>([])

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

  /** 加载所有已存在日记的日期列表 */
  async function loadDiaryDates(): Promise<void> {
    const all = await getStorage().getAllDiaries()
    diaryDates.value = all.map((d) => d.date)
  }

  return {
    currentDiary,
    diaryDates,
    loadDiary,
    saveDiary,
    deleteDiary,
    loadDiaryDates
  }
})
