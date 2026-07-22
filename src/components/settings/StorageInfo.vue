<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { isTauri } from '@/utils/backup'

const desktop = isTauri()
const dbPath = ref<string>('')
const isLoading = ref<boolean>(desktop)

onMounted(async () => {
  if (!desktop) return
  try {
    const { appDataDir } = await import('@tauri-apps/api/path')
    const dir = await appDataDir()
    const sep = /[\\/]$/.test(dir) ? '' : '/'
    dbPath.value = `${dir}${sep}qingji.db`
  } catch {
    dbPath.value = 'qingji.db'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="card">
    <div class="section-header">
      <h3 class="section-title">数据存储位置</h3>
      <p class="section-desc">
        {{
          desktop
            ? '数据保存在本地 SQLite 数据库中'
            : '数据保存在浏览器本地存储中（IndexedDB）'
        }}
      </p>
    </div>

    <div v-if="desktop" class="storage-path">
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
        class="path-icon"
      >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14a9 3 0 0 0 18 0V5" />
        <path d="M3 12a9 3 0 0 0 18 0" />
      </svg>
      <code v-if="!isLoading" class="path-text">{{ dbPath }}</code>
      <span v-else class="path-loading">获取路径中…</span>
    </div>
    <p v-else class="storage-hint">
      关闭浏览器或清除数据可能导致丢失，建议定期导出备份。
    </p>
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

.storage-path {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
}
.path-icon {
  flex-shrink: 0;
  color: var(--color-text-secondary);
}
.path-text {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.8rem;
  color: var(--color-text-primary);
  word-break: break-all;
  line-height: 1.5;
}
.path-loading {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.storage-hint {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
}
</style>
