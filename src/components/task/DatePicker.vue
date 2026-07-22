<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function shift(delta: number): void {
  const d = parseDate(props.modelValue)
  d.setDate(d.getDate() + delta)
  emit('update:modelValue', formatDate(d))
}

function onInput(e: Event): void {
  const value = (e.target as HTMLInputElement).value
  if (value) emit('update:modelValue', value)
}

const weekdayLabel = computed(() => {
  try {
    const d = parseDate(props.modelValue)
    return new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(d)
  } catch {
    return ''
  }
})

const fullLabel = computed(() => {
  try {
    const d = parseDate(props.modelValue)
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(d)
  } catch {
    return props.modelValue
  }
})
</script>

<template>
  <div class="date-picker">
    <button
      type="button"
      class="dp-nav"
      aria-label="前一天"
      @click="shift(-1)"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
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

    <div class="dp-field">
      <div class="dp-labels">
        <span class="dp-full">{{ fullLabel }}</span>
        <span class="dp-weekday">{{ weekdayLabel }}</span>
      </div>
      <input
        type="date"
        class="dp-input"
        :value="modelValue"
        aria-label="选择日期"
        @input="onInput"
      />
    </div>

    <button
      type="button"
      class="dp-nav"
      aria-label="后一天"
      @click="shift(1)"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
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
</template>

<style scoped>
.date-picker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
}

.dp-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 0.5rem;
  border: none;
  padding: 0;
  background-color: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 200ms ease, background-color 200ms ease, transform 120ms ease;
}
.dp-nav:hover {
  color: var(--color-brand);
  background-color: var(--color-bg);
}
.dp-nav:active {
  transform: scale(0.92);
}

.dp-field {
  flex: 1 1 0%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}
.dp-labels {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 0.375rem;
}
.dp-full {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
.dp-weekday {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.dp-input {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background-color: transparent;
  border: none;
  outline: none;
  padding: 0.125rem 0;
  cursor: pointer;
  width: auto;
}
.dp-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
}
</style>
