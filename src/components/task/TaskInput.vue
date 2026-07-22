<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{ placeholder?: string }>(), {
  placeholder: '添加任务...'
})
const emit = defineEmits<{ add: [content: string] }>()

const text = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function submit() {
  const trimmed = text.value.trim()
  if (!trimmed) return
  emit('add', trimmed)
  text.value = ''
  inputRef.value?.focus()
}
</script>

<template>
  <form class="task-input-wrap" @submit.prevent="submit">
    <input
      ref="inputRef"
      v-model="text"
      type="text"
      class="task-input-field"
      :placeholder="placeholder"
      autocomplete="off"
    />
    <button
      type="submit"
      class="task-input-btn"
      :disabled="!text.trim()"
      aria-label="添加任务"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  </form>
</template>

<style scoped>
.task-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  transition: border-color 200ms ease;
}
.task-input-wrap:focus-within {
  border-color: var(--color-brand);
}

.task-input-field {
  flex: 1 1 0%;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-text-primary);
  background-color: transparent;
  border: none;
  outline: none;
}
.task-input-field::placeholder {
  color: var(--color-text-secondary);
}

.task-input-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 0.5rem;
  border: none;
  padding: 0;
  background-color: var(--color-brand);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: filter 200ms ease, opacity 200ms ease, transform 120ms ease;
}
.task-input-btn:hover:not(:disabled) {
  filter: brightness(0.92);
}
.task-input-btn:active:not(:disabled) {
  transform: scale(0.94);
}
.task-input-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
