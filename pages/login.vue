<script setup>
// 로그인 / 가입 — ported from 로그인.html.
// Header/tabbar come from the default layout (AppHeader). This page renders only
// the auth card. Social login is wired to real Supabase OAuth (kakao/google);
// a graceful inline error shows if a provider isn't enabled yet. Already-logged-in
// visitors are bounced straight to the redirect target.
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

usePageSeo('login')
useSeoMeta({ robots: 'noindex, nofollow' })

// 진입 사유 배너: pro / save 일 때만 노출(디자인 renderReason 동일).
const reason = computed(() => {
  const r = String(route.query.reason || '')
  return r === 'pro' || r === 'save' ? r : null
})
const reasonText = computed(() => t('auth.reason.' + reason.value))

// 복귀 경로(path). 안전하게 내부 경로만 허용, 기본은 홈.
const redirectPath = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') ? r : '/'
})

// 약관/개인정보 링크를 실제 라우트로 치환(원본 href는 프로토타입 .html).
const termsHtml = computed(() =>
  t('auth.terms')
    .replace('이용약관.html', localePath('/terms'))
    .replace('개인정보처리방침.html', localePath('/privacy')),
)

// 이미 로그인 상태면 복귀 경로로 보냄.
function bounceIfLoggedIn() {
  if (user.value) navigateTo(localePath(redirectPath.value))
}
onMounted(bounceIfLoggedIn)
watch(user, bounceIfLoggedIn)

const errorMsg = ref('')
const busy = ref('')
async function signIn(provider) {
  errorMsg.value = ''
  busy.value = provider
  const redirectTo =
    typeof window !== 'undefined' ? window.location.origin + localePath(redirectPath.value) : undefined
  // signInWithOAuth가 성공하면 브라우저가 provider로 전체 이동한다.
  // provider 미설정 등으로 실패하면 에러를 인라인 안내.
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
  if (error) {
    errorMsg.value = t('auth.error')
    busy.value = ''
  }
}
function continueAsGuest() {
  navigateTo(localePath(redirectPath.value))
}
</script>

<template>
  <main class="auth-shell">
    <div class="auth-card">
      <!-- LEFT: brand -->
      <aside class="brand-panel">
        <div class="ring" />
        <div class="ring two" />
        <div class="brand-eyebrow">{{ t('auth.eyebrow') }}</div>
        <div class="brand-mid">
          <div class="seal"><span>道</span><span>悟</span><span>運</span><span>勢</span></div>
          <p class="brand-line" v-html="t('auth.brandLine')" />
        </div>
        <div class="benefits">
          <div class="b-title">{{ t('auth.benefit.title') }}</div>
          <div class="benefit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
            <span>{{ t('auth.benefit.save') }}</span>
          </div>
          <div class="benefit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            <span>{{ t('auth.benefit.pro') }}</span>
          </div>
          <div class="benefit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            <span>{{ t('auth.benefit.sync') }}</span>
          </div>
        </div>
      </aside>

      <!-- RIGHT: auth -->
      <section class="auth-panel">
        <div v-if="reason" class="reason-banner show">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          <span>{{ reasonText }}</span>
        </div>
        <div class="auth-head">
          <h1 class="auth-title">{{ t('auth.title') }}</h1>
          <p class="auth-sub" v-html="t('auth.sub')" />
        </div>
        <div class="social-list">
          <button class="social-btn btn-kakao" :disabled="busy" @click="signIn('kakao')">
            <span class="ic">
              <svg width="20" height="20" viewBox="0 0 256 256" aria-hidden="true"><path fill="#191600" d="M128 36C70.56 36 24 72.89 24 118.4c0 29.46 19.55 55.3 48.91 69.78-1.62 5.6-10.4 35.9-10.75 38.28 0 0-.21 1.8.95 2.49 1.16.69 2.72.16 2.72.16 3.39-.47 39.27-25.7 45.48-30.07 5.42.76 11 .96 16.69.96 57.44 0 104-36.89 104-82.4S185.44 36 128 36z" /></svg>
            </span>
            <span>{{ t('auth.kakao') }}</span>
          </button>
          <button class="social-btn btn-google" :disabled="busy" @click="signIn('google')">
            <span class="ic">
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </span>
            <span>{{ t('auth.google') }}</span>
          </button>
        </div>
        <p v-if="errorMsg" class="auth-error">{{ errorMsg }}</p>
        <p class="new-note">{{ t('auth.newNote') }}</p>
        <div class="or-divider"><span>{{ t('auth.or') }}</span></div>
        <button class="guest-btn" @click="continueAsGuest">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          <span>{{ t('auth.guest') }}</span>
        </button>
        <div class="auth-foot">
          <p class="terms" v-html="termsHtml" />
          <div class="secure">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <span>{{ t('auth.secure') }}</span>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 110px var(--space-6) var(--space-16);
  position: relative;
  overflow: hidden;
}
/* mystic backdrop */
.auth-shell::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(900px 600px at 30% 25%, rgba(201, 168, 76, 0.10), transparent 60%),
    radial-gradient(700px 500px at 80% 80%, rgba(139, 92, 246, 0.08), transparent 60%);
  pointer-events: none;
}
.auth-shell::after {
  content: '';
  position: absolute; inset: 0;
  background-image:
    radial-gradient(1.5px 1.5px at 20% 30%, rgba(240, 208, 128, 0.6), transparent),
    radial-gradient(1.5px 1.5px at 70% 20%, rgba(240, 208, 128, 0.4), transparent),
    radial-gradient(1px 1px at 45% 70%, rgba(232, 224, 208, 0.5), transparent),
    radial-gradient(1px 1px at 85% 55%, rgba(240, 208, 128, 0.5), transparent),
    radial-gradient(1.5px 1.5px at 60% 85%, rgba(232, 224, 208, 0.4), transparent),
    radial-gradient(1px 1px at 12% 80%, rgba(240, 208, 128, 0.4), transparent);
  opacity: 0.7;
  pointer-events: none;
}

.auth-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 920px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--bg-secondary);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-deep), var(--shadow-inset);
}

/* ---------- Brand panel (left) ---------- */
.brand-panel {
  position: relative;
  padding: var(--space-12) var(--space-8);
  background:
    linear-gradient(160deg, rgba(201, 168, 76, 0.07), transparent 55%),
    var(--bg-tertiary);
  border-right: 1px solid var(--gold-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-8);
  overflow: hidden;
}
.brand-panel .ring {
  position: absolute;
  width: 360px; height: 360px;
  right: -140px; top: -120px;
  border: 1px solid var(--gold-border);
  border-radius: 50%;
  opacity: 0.5;
}
.brand-panel .ring.two {
  width: 240px; height: 240px;
  right: -80px; top: -60px;
  border-color: var(--gold-border-strong);
  opacity: 0.4;
}
.brand-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold-primary);
  position: relative;
}
.brand-mid { position: relative; }
.seal {
  display: inline-flex;
  flex-direction: column;
  gap: 10px;
  padding: var(--space-4) var(--space-3);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-md);
  background: rgba(10, 10, 15, 0.35);
  margin-bottom: var(--space-6);
}
.seal span {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 2rem;
  line-height: 1;
  color: var(--gold-light);
  text-align: center;
}
.brand-line {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}
.benefits {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.benefits .b-title {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.benefit {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}
.benefit svg { color: var(--gold-primary); flex-shrink: 0; }

/* ---------- Auth panel (right) ---------- */
.auth-panel {
  padding: var(--space-12) var(--space-8);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.auth-head { margin-bottom: var(--space-8); }
.auth-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-3);
}
.auth-sub {
  color: var(--text-secondary);
  font-size: var(--text-base);
  line-height: 1.6;
}

/* reason banner */
.reason-banner {
  display: none;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--gold-soft);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-6);
  color: var(--gold-light);
  font-size: var(--text-sm);
  line-height: 1.5;
}
.reason-banner.show { display: flex; }
.reason-banner svg { color: var(--gold-primary); flex-shrink: 0; margin-top: 1px; }

/* social buttons */
.social-list { display: flex; flex-direction: column; gap: var(--space-3); }
.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  width: 100%;
  padding: 14px 18px;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 600;
  transition: transform 0.15s var(--ease-out), box-shadow 0.2s, filter 0.2s;
  position: relative;
}
.social-btn:hover { transform: translateY(-2px); }
.social-btn:active { transform: translateY(0); }
.social-btn:disabled { opacity: 0.6; pointer-events: none; }
.social-btn .ic { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; }
.btn-kakao {
  background: #FEE500;
  color: #191600;
  box-shadow: 0 4px 16px rgba(254, 229, 0, 0.18);
}
.btn-kakao:hover { box-shadow: 0 8px 24px rgba(254, 229, 0, 0.30); }
.btn-google {
  background: #FFFFFF;
  color: #1F1F1F;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}
.btn-google:hover { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); }

.auth-error {
  margin-top: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--danger, #DC2626);
  border-radius: var(--radius-md);
  background: rgba(220, 38, 38, 0.08);
  color: #F87171;
  font-size: var(--text-sm);
  line-height: 1.5;
  text-align: center;
}

.new-note {
  margin-top: var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.6;
  text-align: center;
}

/* divider */
.or-divider {
  display: flex; align-items: center; gap: var(--space-4);
  margin: var(--space-6) 0;
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.or-divider::before, .or-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--gold-border);
}

.guest-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 18px;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold-border);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  transition: all 0.2s;
}
.guest-btn:hover { border-color: var(--gold-primary); color: var(--gold-light); background: var(--gold-soft); }

.auth-foot {
  margin-top: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.terms {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.7;
  text-align: center;
}
.terms :deep(a) { color: var(--text-secondary); text-decoration: underline; text-underline-offset: 2px; }
.terms :deep(a:hover) { color: var(--gold-primary); }
.secure {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.secure svg { color: var(--gold-deep); }

/* ---------- Responsive ---------- */
@media (max-width: 760px) {
  .auth-card { grid-template-columns: 1fr; max-width: 460px; }
  .brand-panel {
    border-right: none;
    border-bottom: 1px solid var(--gold-border);
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-8);
    gap: var(--space-6);
  }
  .brand-panel .benefits { display: none; }
  .seal { flex-direction: row; margin-bottom: 0; padding: 8px 12px; }
  .seal span { font-size: 1.4rem; }
  .brand-line { font-size: var(--text-xl); }
  .brand-mid { display: flex; align-items: center; gap: var(--space-4); }
  .auth-panel { padding: var(--space-8); }
}
@media (max-width: 460px) {
  .brand-panel { flex-direction: column; align-items: flex-start; }
  .brand-mid { flex-direction: column; align-items: flex-start; }
}
</style>
