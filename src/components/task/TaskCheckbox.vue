<script setup lang="ts">
// 圆形自定义复选框：未完成空心，已完成实心 + 对勾。
// 颜色由调用方传入（任务随机色），未传时回退到品牌蓝。
import { computed } from 'vue'

const props = defineProps<{ checked: boolean; disabled?: boolean; color?: string }>()
defineEmits<{ toggle: [] }>()

const effectiveColor = computed(() => props.color || 'var(--color-brand)')
</script>

<template>
  <button
    type="button"
    class="task-checkbox"
    :class="{ 'is-checked': checked }"
    :style="{ color: effectiveColor }"
    role="checkbox"
    :aria-checked="checked"
    :disabled="disabled"
    @click="$emit('toggle')"
  >
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        stroke-width="1.75"
        :fill="checked ? 'currentColor' : 'none'"
      />
      <path
        v-if="checked"
        d="M7.5 12.5l3 3 6-6.5"
        stroke="#fff"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.task-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  border: none;
  padding: 0;
  background-color: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 200ms ease, transform 120ms ease;
}
.task-checkbox:hover {
  background-color: var(--color-bg);
}
.task-checkbox:active {
  transform: scale(0.92);
}
.task-checkbox:disabled {
  cursor: default;
}
.task-checkbox:disabled:hover {
  background-color: transparent;
}
.task-checkbox:disabled:active {
  transform: none;
}
</style>
