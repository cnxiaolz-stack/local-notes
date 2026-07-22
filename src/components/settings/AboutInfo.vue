<script setup lang="ts">
const appVersion = 'v0.1.0'
// 部署到自己的 GitHub 仓库后，将下面的地址替换为你的仓库 URL（如 'https://github.com/用户名/qingji'）即可显示链接；留空则不显示。
const repoUrl = ''
</script>

<template>
  <div class="card">
    <div class="section-header">
      <h3 class="section-title">关于</h3>
    </div>

    <div class="about-content">
      <div class="about-name-row">
        <div class="about-logo">轻</div>
        <div>
          <p class="about-name">轻记 QingJi</p>
          <p class="about-version">{{ appVersion }}</p>
        </div>
      </div>

      <p class="about-desc">一个本地化、轻量的便签、任务与日记应用</p>
      <p class="about-tech">基于 Vue 3 + Tauri 构建</p>

      <a
        v-if="repoUrl"
        :href="repoUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="about-link"
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
        <span>GitHub 仓库</span>
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M7 17L17 7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      </a>
    </div>
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

.about-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.about-name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.about-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  background-color: var(--color-brand);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 600;
  flex-shrink: 0;
}
.about-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}
.about-version {
  margin: 0.125rem 0 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.about-desc {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text-primary);
}
.about-tech {
  margin: 0;
  font-size: 0.825rem;
  color: var(--color-text-secondary);
}

.about-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  align-self: flex-start;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 0.825rem;
  text-decoration: none;
  transition: color 200ms ease, border-color 200ms ease,
    background-color 200ms ease;
}
.about-link:hover {
  color: var(--color-brand);
  border-color: var(--color-brand);
}
</style>
