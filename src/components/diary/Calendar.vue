<script setup lang="ts">
// 日记日历视图：月历网格 + 有日记的日期标记点 + 今日高亮
import { computed, ref } from 'vue'

const props = defineProps<{
  /** 已有日记的日期集合（YYYY-MM-DD） */
  diaryDates: string[]
  /** 当前选中的日期（YYYY-MM-DD） */
  selectedDate: string
}>()
const emit = defineEmits<{ select: [date: string] }>()

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayStr = formatYmd(new Date())

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long'
  }).format(new Date(viewYear.value, viewMonth.value, 1))
)

interface DayCell {
  date: string
  day: number
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  hasDiary: boolean
}

const cells = computed<DayCell[]>(() => {
  const result: DayCell[] = []
  const firstOfMonth = new Date(viewYear.value, viewMonth.value, 1)
  // 周一为一周起始：JS getDay() 周日=0..周六=6，转换为周一=0..周日=6
  let startWeekday = firstOfMonth.getDay() - 1
  if (startWeekday < 0) startWeekday = 6
  const startDate = new Date(firstOfMonth)
  startDate.setDate(startDate.getDate() - startWeekday)

  const dateSet = new Set(props.diaryDates)
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    const dateStr = formatYmd(d)
    result.push({
      date: dateStr,
      day: d.getDate(),
      inMonth: d.getMonth() === viewMonth.value,
      isToday: dateStr === todayStr,
      isSelected: dateStr === props.selectedDate,
      hasDiary: dateSet.has(dateStr)
    })
  }
  return result
})

function prevMonth(): void {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth(): void {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function selectDay(cell: DayCell): void {
  emit('select', cell.date)
}
</script>

<template>
  <div class="calendar">
    <div class="cal-header">
      <button
        type="button"
        class="cal-nav"
        aria-label="上一月"
        @click="prevMonth"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span class="cal-month-label">{{ monthLabel }}</span>
      <button
        type="button"
        class="cal-nav"
        aria-label="下一月"
        @click="nextMonth"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>

    <div class="cal-grid">
      <div
        v-for="w in weekdays"
        :key="w"
        class="cal-weekday"
      >
        {{ w }}
      </div>
      <button
        v-for="cell in cells"
        :key="cell.date"
        type="button"
        class="cal-cell"
        :class="{
          'is-out': !cell.inMonth,
          'is-today': cell.isToday,
          'is-selected': cell.isSelected,
          'has-diary': cell.hasDiary
        }"
        :aria-label="cell.date"
        @click="selectDay(cell)"
      >
        <span class="cal-day-num">{{ cell.day }}</span>
        <span v-if="cell.hasDiary" class="cal-dot" aria-hidden="true"></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.cal-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 0.5rem;
  border: none;
  background-color: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 200ms ease, background-color 200ms ease, transform 120ms ease;
}
.cal-nav:hover {
  color: var(--color-brand);
  background-color: var(--color-bg);
}
.cal-nav:active {
  transform: scale(0.92);
}

.cal-month-label {
  flex: 1 1 0%;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}

.cal-weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.cal-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 40px;
  padding: 0;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  background-color: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color 200ms ease, color 200ms ease,
    border-color 200ms ease, transform 120ms ease;
}
.cal-cell:hover {
  background-color: var(--color-bg);
}
.cal-cell:active {
  transform: scale(0.94);
}

.cal-cell.is-out {
  color: var(--color-text-secondary);
  opacity: 0.45;
}

.cal-day-num {
  font-size: 0.8rem;
  line-height: 1;
}

.cal-dot {
  width: 4px;
  height: 4px;
  border-radius: 9999px;
  background-color: var(--color-brand);
}

.cal-cell.is-today {
  border-color: var(--color-brand);
  color: var(--color-brand);
  font-weight: 600;
}

.cal-cell.is-selected {
  background-color: var(--color-brand);
  color: #fff;
  border-color: var(--color-brand);
}
.cal-cell.is-selected .cal-dot {
  background-color: #fff;
}
.cal-cell.is-selected:hover {
  background-color: var(--color-brand);
  filter: brightness(0.92);
}

/* 触摸设备始终可点击反馈 */
@media (hover: none) {
  .cal-cell:hover {
    background-color: transparent;
  }
  .cal-cell.is-selected:hover {
    background-color: var(--color-brand);
  }
}
</style>
