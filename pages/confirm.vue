<script setup>
// OAuth / 매직링크 콜백 — Supabase 클라이언트가 URL의 토큰/코드로 세션을 확립하면
// useSupabaseUser가 채워진다. 세션이 잡히면 next(원래 가려던 곳)로 포워딩.
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const user = useSupabaseUser()

useSeoMeta({ title: () => `${t('auth.confirming')} · ${t('seo.titleSuffix')}`, robots: 'noindex, nofollow' })

const next = computed(() => {
  const n = route.query.next
  return typeof n === 'string' && n.startsWith('/') ? n : '/'
})

function go() {
  if (!user.value) return
  // Meta Pixel CompleteRegistration — 카카오/구글 OAuth 성공 착지. 유저당 localStorage 1회 가드(가입 근사).
  // (이메일 로그인은 /confirm을 거치지 않으므로 미포함 — 광고 유입은 소셜이라 무방.)
  useMetaPixel().trackCompleteRegistration(user.value.id)
  navigateTo(localePath(next.value), { replace: true })
}
onMounted(() => {
  go()
  // 세션이 비동기로 확립될 수 있어 잠시 대기 후 폴백(미로그인이면 로그인으로).
  setTimeout(() => {
    if (!user.value) navigateTo(localePath({ path: '/login', query: { redirect: next.value } }), { replace: true })
  }, 4000)
})
watch(user, go)
</script>

<template>
  <main class="confirm">
    <div class="spinner" />
    <p>{{ t('auth.confirming') }}</p>
  </main>
</template>

<style scoped>
.confirm { min-height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-5); color: var(--text-secondary); }
.spinner { width: 38px; height: 38px; border-radius: 50%; border: 3px solid var(--gold-border); border-top-color: var(--gold-primary); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
