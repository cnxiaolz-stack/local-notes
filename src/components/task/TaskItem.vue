<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { Task } from '@/types'
import TaskCheckbox from './TaskCheckbox.vue'
import { formatRelative } from '@/utils/time'

const props = defineProps<{ task: Task; readonly?: boolean }>()
const emit = defineEmits<{
  toggle: []
  save: [content: string]
  delete: []
}>()

const createdLabel = computed(() => formatRelative(props.task.created_at))
const updatedLabel = computed(() => formatRelative(props.task.updated_at))

const isEditing = ref(false)
const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function startEdit() {
  if (props.readonly) return
  draft.value = props.task.content
  isEditing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function cancelEdit() {
  isEditing.value = false
  draft.value = ''
}

function commitEdit() {
  if (!isEditing.value) return
  const trimmed = draft.value.trim()
  if (!trimmed || trimmed === props.task.content) {
    cancelEdit()
    return
  }
  emit('save', trimmed)
  isEditing.value = false
  draft.value = ''
}

function onInputBlur() {
  commitEdit()
}

function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitEdit()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  }
}

function handleDelete() {
  if (window.confirm('确定要删除这个任务吗？')) {
    emit('delete')
  }
}
</script>

<template>
  <div class="task-item" :class="{ 'is-done': task.completed }">
    <TaskCheckbox
      :checked="task.completed"
      :disabled="readonly"
      :color="task.color"
      @toggle="emit('toggle')"
    />

    <div class="task-content-wrap">
      <p
        v-if="!isEditing"
        class="task-content"
        :class="{ 'is-editable': !readonly }"
        @click="startEdit"
      >
        {{ task.content }}
      </p>
      <input
        v-else
        ref="inputRef"
        v-model="draft"
        type="text"
        class="task-edit-input"
        @keydown="onInputKeydown"
        @blur="onInputBlur"
      />
      <p v-if="!isEditing" class="task-meta">
        创建于 {{ createdLabel }} · 修改于 {{ updatedLabel }}
      </p>
    </div>

    <div v-if="!readonly && !isEditing" class="task-actions">
      <button
        type="button"
        class="icon-btn"
        aria-label="编辑任务"
        @click="startEdit"
      >
        <svg
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
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </button>
      <button
        type="button"
        class="icon-btn"
        aria-label="删除任务"
        @click="handleDelete"
      >
        <svg
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
          <polyline points="3 6 5 6 21 6" />
          <path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.task-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background-color: var(--color-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--color-border);
  transition: border-color 200ms ease, background-color 200ms ease;
}
.task-item:hover {
  border-color: var(--color-brand);
}

.task-content-wrap {
  flex: 1 1 0%;
  min-width: 0;
}

.task-content {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-text-primary);
  word-break: break-word;
  transition: color 200ms ease;
}
.task-content.is-editable {
  cursor: text;
}
.task-item.is-done .task-content {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}

.task-meta {
  margin: 0.25rem 0 0;
  font-size: 0.7rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.task-edit-input {
  width: 100%;
  margin: 0;
  padding: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-text-primary);
  background-color: transparent;
  border: none;
  outline: none;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 200ms ease;
}
.task-item:hover .task-actions,
.task-item:focus-within .task-actions {
  opacity: 1;
}

.icon-btn {
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
.icon-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg);
}
.icon-btn:active {
  transform: scale(0.92);
}

/* 触摸设备无 hover，始终显示操作按钮 */
@media (hover: none) {
  .task-actions {
    opacity: 1;
  }
}
</style>
