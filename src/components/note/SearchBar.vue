<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ modelValue: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const value = computed<string>({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

function clear(): void {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="search-bar">
    <svg
      class="search-icon"
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      v-model="value"
      type="text"
      class="search-input"
      :placeholder="placeholder ?? '搜索便签...'"
      autocomplete="off"
      aria-label="搜索便签"
    />
    <button
      v-if="value"
      type="button"
      class="search-clear"
      aria-label="清空搜索"
      @click="clear"
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
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  transition: border-color 200ms ease;
}
.search-bar:focus-within {
  border-color: var(--color-brand);
}

.search-icon {
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.search-input {
  flex: 1 1 0%;
  min-width: 0;
  padding: 0.375rem 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-text-primary);
  background-color: transparent;
  border: none;
  outline: none;
}
.search-input::placeholder {
  color: var(--color-text-secondary);
}

.search-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 0.5rem;
  border: none;
  padding: 0;
  background-color: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 200ms ease, background-color 200ms ease, transform 120ms ease;
}
.search-clear:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg);
}
.search-clear:active {
  transform: scale(0.92);
}
</style>
