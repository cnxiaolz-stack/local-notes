<script setup lang="ts">
import { ref } from 'vue'
import { exportJSON, exportMarkdown, importJSON } from '@/utils/backup'

type MessageType = 'success' | 'error'

const message = ref('')
const messageType = ref<MessageType>('success')
const isExportingJson = ref(false)
const isExportingMd = ref(false)
const isImporting = ref(false)

function showMessage(text: string, type: MessageType): void {
  message.value = text
  messageType.value = type
}

async function handleExportJSON(): Promise<void> {
  isExportingJson.value = true
  try {
    await exportJSON()
    showMessage('已导出 JSON 备份文件', 'success')
  } catch (err) {
    showMessage(
      `导出失败：${err instanceof Error ? err.message : String(err)}`,
      'error'
    )
  } finally {
    isExportingJson.value = false
  }
}

async function handleExportMarkdown(): Promise<void> {
  isExportingMd.value = true
  try {
    await exportMarkdown()
    showMessage('已导出 Markdown 备份文件', 'success')
  } catch (err) {
    showMessage(
      `导出失败：${err instanceof Error ? err.message : String(err)}`,
      'error'
    )
  } finally {
    isExportingMd.value = false
  }
}

async function handleImportJSON(): Promise<void> {
  if (!window.confirm('导入将覆盖当前所有数据，确定继续吗？')) return
  isImporting.value = true
  try {
    const result = await importJSON()
    if (result.success) {
      showMessage(`${result.message}。建议刷新页面以查看更新。`, 'success')
    } else {
      showMessage(result.message, 'error')
    }
  } catch (err) {
    showMessage(
      `导入失败：${err instanceof Error ? err.message : String(err)}`,
      'error'
    )
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <div class="card">
    <div class="section-header">
      <h3 class="section-title">数据管理</h3>
      <p class="section-desc">导出备份或从备份恢复数据</p>
    </div>

    <div class="data-buttons">
      <button
        type="button"
        class="btn btn-primary"
        :disabled="isExportingJson"
        @click="handleExportJSON"
      >
        <svg
          v-if="!isExportingJson"
          class="btn-icon"
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {{ isExportingJson ? '导出中…' : '导出为 JSON' }}
      </button>

      <button
        type="button"
        class="btn btn-secondary"
        :disabled="isExportingMd"
        @click="handleExportMarkdown"
      >
        <svg
          v-if="!isExportingMd"
          class="btn-icon"
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {{ isExportingMd ? '导出中…' : '导出为 Markdown' }}
      </button>

      <button
        type="button"
        class="btn btn-secondary"
        :disabled="isImporting"
        @click="handleImportJSON"
      >
        <svg
          v-if="!isImporting"
          class="btn-icon"
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {{ isImporting ? '导入中…' : '从 JSON 导入' }}
      </button>
    </div>

    <p class="data-hint">导入会覆盖当前所有数据，建议定期导出备份。</p>

    <Transition name="msg-fade">
      <div
        v-if="message"
        class="data-message"
        :class="`msg-${messageType}`"
        role="status"
      >
        {{ message }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.section-header {
  margin-bottom: 1.125rem;
}
.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}
.section-desc {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.data-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
@media (min-width: 480px) {
  .data-buttons {
    flex-direction: row;
  }
  .data-buttons .btn {
    flex: 1 1 0%;
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 40px;
  padding: 0 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 200ms ease, border-color 200ms ease,
    color 200ms ease, filter 200ms ease, transform 120ms ease;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-icon {
  flex-shrink: 0;
}

.btn-primary {
  background-color: var(--color-brand);
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  filter: brightness(0.92);
}
.btn-primary:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-secondary {
  background-color: transparent;
  border-color: var(--color-border);
  color: var(--color-text-primary);
}
.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-brand);
  color: var(--color-brand);
}
.btn-secondary:active:not(:disabled) {
  transform: scale(0.98);
}

.data-hint {
  margin: 0.875rem 0 0;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.data-message {
  margin-top: 0.875rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  line-height: 1.5;
  background-color: var(--color-bg);
  border-left: 3px solid var(--color-border);
  color: var(--color-text-primary);
  word-break: break-word;
}
.msg-success {
  border-left-color: var(--color-accent);
}
.msg-error {
  border-left-color: #ef4444;
}

.msg-fade-enter-active,
.msg-fade-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.msg-fade-enter-from,
.msg-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
