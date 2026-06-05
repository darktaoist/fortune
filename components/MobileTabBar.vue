<script setup>
// Fixed bottom tab bar shown on mobile (<= 640px). Shared via default layout.
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const isHome = computed(() => route.path === localePath('/'))
</script>

<template>
  <nav class="mobile-tabbar">
    <NuxtLink class="tab-item" :class="{ active: isHome }" :to="localePath('/')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
      <span>{{ t('tab.home') }}</span>
    </NuxtLink>
    <NuxtLink class="tab-item" :to="localePath({ path: '/', hash: '#free' })">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
      <span>{{ t('tab.fortune') }}</span>
    </NuxtLink>
    <NuxtLink class="tab-item" :to="localePath({ path: '/celeb-select', query: { service: 'celeb' } })">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
      <span>{{ t('tab.match') }}</span>
    </NuxtLink>
    <NuxtLink class="tab-item" :to="localePath('/library')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
      <span>{{ t('tab.library') }}</span>
    </NuxtLink>
    <NuxtLink class="tab-item" :to="localePath('/mypage')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
      <span>{{ t('tab.profile') }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.mobile-tabbar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid var(--gold-border);
  padding: var(--space-2) 0;
  z-index: 90;
}
@media (max-width: 640px) {
  .mobile-tabbar { display: flex; justify-content: space-around; }
}
.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 12px;
  color: var(--text-muted);
  font-size: 10px;
  letter-spacing: 0.05em;
}
.tab-item.active { color: var(--gold-primary); }
.tab-item svg { width: 20px; height: 20px; }
</style>
