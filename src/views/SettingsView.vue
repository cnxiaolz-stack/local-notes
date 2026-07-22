<script setup lang="ts">
import ThemeSettings from '@/components/settings/ThemeSettings.vue'
import DataManagement from '@/components/settings/DataManagement.vue'
import StorageInfo from '@/components/settings/StorageInfo.vue'
import AboutInfo from '@/components/settings/AboutInfo.vue'
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <p class="settings-intro">主题、数据与个性化偏好。</p>

    <div class="settings-list">
      <ThemeSettings />
      <DataManagement />
      <StorageInfo />
      <AboutInfo />
    </div>
  </section>
</template>

<style scoped>
.settings-intro {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1.5rem;
}
</style>
