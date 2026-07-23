import { defineStore } from 'pinia'
import { ref } from 'vue'
import { todayStr } from '@/utils/time'

/**
 * 应用级状态：管理全局选中的日期（任务/便签/日记三页共用）。
 *
 * 主题已精简为唯一的纯白极简风格，不再需要状态管理。
 */
export const useAppStore = defineStore('app', () => {
  /** 全局选中的日期（YYYY-MM-DD），默认今天 */
  const selectedDate = ref<string>(todayStr())

  /** 当前页面向日历提供的标记日期（有数据的日期），由各页 onMounted/watch 时更新 */
  const currentMarkedDates = ref<string[]>([])

  /** 是否展开「全部列表」（今日/便签/日记三页共用，header 按钮控制；切页自动收起） */
  const showAllList = ref<boolean>(false)

  /** 切换全局选中日期 */
  function setSelectedDate(date: string): void {
    selectedDate.value = date
  }

  /** 更新日历标记日期（由当前页面提供） */
  function setMarkedDates(dates: string[]): void {
    currentMarkedDates.value = dates
  }

  /** 设置「全部列表」展开态 */
  function setAllList(v: boolean): void {
    showAllList.value = v
  }

  /** 切换「全部列表」展开态 */
  function toggleAllList(): void {
    showAllList.value = !showAllList.value
  }

  return {
    selectedDate,
    currentMarkedDates,
    showAllList,
    setSelectedDate,
    setMarkedDates,
    setAllList,
    toggleAllList
  }
})
