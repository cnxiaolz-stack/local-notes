<script setup lang="ts">
// 全局日期选择按钮：显示当前选中日期 + 日历图标，点击弹出通用日历浮层。
// 任务/便签/日记三页共用，通过 app store 的 selectedDate / currentMarkedDates 联动。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import Calendar from '@/components/common/Calendar.vue'

const app = useAppStore()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const dateLabel = computed(() => {
  try {
    const [y, m, d] = app.selectedDate.split('-').map(Number)
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(new Date(y, (m || 1) - 1, d || 1))
  } catch {
    return app.selectedDate
  }
})

function toggle(): void {
  open.value = !open.value
}

function onSelect(date: string): void {
  app.setSelectedDate(date)
  open.value = false
}

function onDocClick(e: MouseEvent): void {
  if (!rootRef.value) return
  if (!rootRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

function onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onEsc)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onEsc)
})
</script>

<template>
  <div ref="rootRef" class="date-picker-button">
    <button
      type="button"
      class="dpb-trigger"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <span class="dpb-label">{{ dateLabel }}</span>
      <svg
        class="dpb-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    </button>

    <Transition name="dpb-pop">
      <div v-if="open" class="dpb-popup" role="dialog" aria-label="选择日期">
        <Calendar
          :marked-dates="app.currentMarkedDates"
          :selected-date="app.selectedDate"
          @select="onSelect"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.date-picker-button {
  position: relative;
  display: inline-block;
}

.dpb-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  border-radius: 0.625rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 200ms ease, color 200ms ease, background-color 200ms ease;
}
.dpb-trigger:hover {
  border-color: var(--color-brand);
  color: var(--color-text-primary);
}

.dpb-label {
  white-space: nowrap;
}

.dpb-icon {
  flex-shrink: 0;
  color: var(--color-text-secondary);
  transition: color 200ms ease;
}
.dpb-trigger:hover .dpb-icon {
  color: var(--color-brand);
}

.dpb-popup {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 50;
  min-width: 280px;
  padding: 0.875rem;
  background-color: var(--color-surface-strong);
  border: 1px solid var(--color-border);
  border-radius: 0.875rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.dpb-pop-enter-active,
.dpb-pop-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.dpb-pop-enter-from,
.dpb-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
