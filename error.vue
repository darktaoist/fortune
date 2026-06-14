<script setup>
// 전역 에러 페이지(404/500 등). 레이아웃 밖에서 렌더되므로 자체 완결 디자인.
// clearError로 에러 상태를 비우고 홈으로 복귀.
const props = defineProps({ error: { type: Object, default: () => ({}) } })
const { t } = useI18n()
const localePath = useLocalePath()

const is404 = computed(() => Number(props.error?.statusCode) === 404)
const code = computed(() => props.error?.statusCode || 500)
function handleHome() { clearError({ redirect: localePath('/') }) }

useSeoMeta({ title: () => `${is404.value ? t('error.404.title') : t('error.500.title')} · ${t('seo.titleSuffix')}`, robots: 'noindex, nofollow' })
</script>

<template>
  <div class="err-shell">
    <div class="err-card">
      <div class="err-glyph">{{ is404 ? '迷' : '厄' }}</div>
      <div class="err-code">{{ code }}</div>
      <h1>{{ is404 ? t('error.404.title') : t('error.500.title') }}</h1>
      <p>{{ is404 ? t('error.404.desc') : t('error.500.desc') }}</p>
      <button class="err-btn" @click="handleHome">{{ t('common.home') }}</button>
    </div>
  </div>
</template>

<style scoped>
.err-shell { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: var(--space-16) var(--space-6); background: var(--bg-primary); position: relative; overflow: hidden; }
.err-shell::before { content: ''; position: absolute; inset: 0; background: radial-gradient(800px 500px at 50% 30%, rgba(201,168,76,0.08), transparent 60%); pointer-events: none; }
.err-card { position: relative; z-index: 1; max-width: 440px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: var(--space-12) var(--space-8); background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-xl); box-shadow: var(--shadow-deep); }
.err-glyph { width: 80px; height: 80px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 38px; font-weight: 700; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(201,168,76,0.25), rgba(139,92,246,0.06)); border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow); margin-bottom: var(--space-3); }
.err-code { font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: 0.2em; color: var(--gold-primary); }
.err-card h1 { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 600; }
.err-card p { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.7; }
.err-btn { margin-top: var(--space-4); padding: 12px 28px; border-radius: var(--radius-md); border: 1px solid var(--gold-primary); background: var(--gold-primary); color: var(--text-on-gold); font-size: var(--text-base); font-weight: 700; transition: transform 0.15s var(--ease-out), box-shadow 0.2s; }
.err-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(201,168,76,0.30); }
</style>
