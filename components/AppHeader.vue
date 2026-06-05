<script setup>
// Fixed site header (logo + nav + language + login). Shared across all pages
// via the default layout. Becomes opaque + blurred once the page is scrolled,
// matching the prototype's `.header.scrolled` behavior.
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 30
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const isHome = computed(() => route.path === localePath('/'))
</script>

<template>
  <header class="header" :class="{ scrolled }">
    <div class="container header-inner">
      <NuxtLink :to="localePath('/')" class="logo">
        <span class="logo-mark">道</span>
        <span class="logo-text">타오운세<span class="hanja">悟運勢</span></span>
      </NuxtLink>

      <nav class="nav-main">
        <NuxtLink :to="localePath('/')" :class="{ active: isHome }">{{ t('nav.home') }}</NuxtLink>
        <NuxtLink :to="localePath({ path: '/', hash: '#free' })">{{ t('nav.free') }}</NuxtLink>
        <NuxtLink :to="localePath({ path: '/', hash: '#premium' })">{{ t('nav.premium') }}</NuxtLink>
        <NuxtLink :to="localePath({ path: '/celeb-select', query: { service: 'celeb' } })">{{ t('nav.celeb') }}</NuxtLink>
        <NuxtLink :to="localePath({ path: '/celeb-select', query: { service: 'mbti' } })">{{ t('nav.mbti') }}</NuxtLink>
        <NuxtLink :to="localePath('/library')">{{ t('nav.library') }}</NuxtLink>
        <a href="https://taoist.co.kr/aura" target="_blank" rel="noopener" class="external">{{ t('nav.aura') }}</a>
      </nav>

      <div class="header-right">
        <button class="icon-btn" type="button" :aria-label="t('common.search')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </button>

        <LangSwitcher />

        <NuxtLink :to="localePath('/login')" class="login-btn">{{ t('common.login') }}</NuxtLink>

        <button class="icon-btn hamburger" type="button" :aria-label="t('common.menu')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" /></svg>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: var(--space-4) 0;
  transition: all 0.3s var(--ease-out);
  background: transparent;
}
.header.scrolled {
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--gold-border);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
}
.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1.5px solid var(--gold-primary);
  border-radius: 50%;
  font-family: var(--font-mono);
  font-size: 18px;
  color: var(--gold-light);
  background: radial-gradient(circle, var(--gold-soft), transparent);
}
.logo-text { color: var(--text-primary); }
.logo-text .hanja {
  font-size: 0.7em;
  color: var(--gold-primary);
  margin-left: 4px;
  font-family: var(--font-mono);
}

.nav-main { display: flex; gap: var(--space-8); }
.nav-main a {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  transition: color 0.2s;
  position: relative;
  padding: 4px 0;
}
.nav-main a:hover { color: var(--text-primary); }
.nav-main a.active { color: var(--gold-primary); }
.nav-main a.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--gold-primary);
}
.nav-main a.external::after {
  content: '↗';
  margin-left: 4px;
  font-size: 0.85em;
  color: var(--gold-primary);
  opacity: 0.6;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.icon-btn {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: all 0.2s;
}
.icon-btn:hover {
  background: var(--bg-tertiary);
  color: var(--gold-primary);
}

.login-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  border-radius: var(--radius-md);
  background: var(--gold-soft);
  border: 1px solid var(--gold-primary);
  color: var(--gold-light);
  font-size: var(--text-sm);
  font-weight: 600;
  transition: all 0.2s;
}
.login-btn:hover {
  background: var(--gold-primary);
  color: var(--text-on-gold);
}

.hamburger { display: none; }

@media (max-width: 1024px) {
  .nav-main { display: none; }
  .hamburger { display: inline-flex; }
}
@media (max-width: 640px) {
  .login-btn { padding: 8px 14px; }
}
</style>
