<script setup lang="ts">
// 日记主视图：当天日记编辑器 + 浏览模式（app.showAllList 时挂载 DiaryBrowse，两者互斥）。
// 日期切换由全局 header 的日历按钮驱动（app.selectedDate）。
// 点 header「全部」按钮（app.showAllList）打开内嵌卡片式浏览（左侧按月分组列表、右侧全文）。
import { onMounted, ref, watch } from 'vue'
import { useDiaryStore } from '@/stores/diary'
import { useAppStore } from '@/stores/app'
import DiaryBrowse from '@/components/diary/DiaryBrowse.vue'
import DiaryEditor from '@/components/diary/DiaryEditor.vue'

const diaryStore = useDiaryStore()
const app = useAppStore()

/** 当前编辑区内容镜像（来自 store.currentDiary，无则为空串） */
const diaryContent = ref<string>('')
/** 切换日期时的加载态（也用于首次挂载，触发旧编辑器卸载并 flushSave） */
const isLoading = ref<boolean>(true)

/** 按全局选中日期加载日记 */
async function loadDate(date: string): Promise<void> {
  isLoading.value = true
  try {
    await diaryStore.loadDiary(date)
    diaryContent.value = diaryStore.currentDiary?.content ?? ''
  } catch (err) {
    console.error('[qingji] 加载日记失败：', err)
    diaryContent.value = ''
  } finally {
    isLoading.value = false
  }
}

// 全局选中日期变化 → 重新加载该日日记
watch(
  () => app.selectedDate,
  (val) => {
    void loadDate(val)
  }
)

// 日记日期集合变化 → 同步全局日历标记
watch(
  () => diaryStore.diaryDates,
  (dates) => {
    app.setMarkedDates(dates)
  }
)

onMounted(async () => {
  try {
    await diaryStore.loadDiaryDates()
  } catch (err) {
    console.error('[qingji] 日记数据加载失败：', err)
  }
  await loadDate(app.selectedDate)
})
</script>

<template>
  <section class="diary-view">
    <!-- 当天日记输入框（浏览模式时卸载，退出后重新挂载） -->
    <div v-if="!app.showAllList" class="diary-main">
      <DiaryEditor
        v-if="!isLoading"
        :key="app.selectedDate"
        :date="app.selectedDate"
        :initial-content="diaryContent"
      />
      <div v-else class="diary-loading">
        <span class="loading-spinner" aria-hidden="true"></span>
        <span>加载中…</span>
      </div>
    </div>

    <!-- 日记浏览模式（header「全部」按钮触发；内嵌卡片，与编辑器互斥） -->
    <DiaryBrowse v-else @close="app.setAllList(false)" />
  </section>
</template>

<style scoped>
.diary-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  /* 填满 .app-main 高度，使编辑器内部滚动而非整页滚动 */
  min-height: 100%;
}

.diary-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.diary-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  min-height: 40vh;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
}
.loading-spinner {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-brand);
  animation: diary-spin 0.8s linear infinite;
}
@keyframes diary-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
