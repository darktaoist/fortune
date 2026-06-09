<script setup>
// 비밀번호 재설정 착지 페이지.
// 재설정 메일의 링크로 들어오면 @nuxtjs/supabase 가 URL의 토큰/코드로 recovery
// 세션을 확립한다. 그 세션 위에서 updateUser 로 새 비밀번호를 저장한다.
const { t } = useI18n()
const localePath = useLocalePath()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

useSeoMeta({ title: () => `${t('auth.newpw.title')} · ${t('seo.titleSuffix')}`, robots: 'noindex, nofollow' })

const password = ref('')
const showPw = ref(false)
const busy = ref(false)
const errorMsg = ref('')
const done = ref(false)

async function submit() {
  if (busy.value) return
  errorMsg.value = ''
  if (password.value.length < 6) { errorMsg.value = t('auth.err.weak'); return }
  // recovery 세션이 아직 없으면 링크가 만료/무효한 경우.
  if (!user.value) { errorMsg.value = t('auth.newpw.expired'); return }
  busy.value = true
  const { error } = await supabase.auth.updateUser({ password: password.value })
  busy.value = false
  if (error) { errorMsg.value = t('auth.newpw.expired'); return }
  done.value = true
  setTimeout(() => navigateTo(localePath('/')), 1600)
}
</script>

<template>
  <main class="reset-shell">
    <div class="reset-card">
      <div class="seal"><span>道</span><span>悟</span></div>
      <h1 class="reset-title">{{ t('auth.newpw.title') }}</h1>

      <p v-if="done" class="reset-ok">{{ t('auth.newpw.done') }}</p>

      <form v-else class="reset-form" @submit.prevent="submit">
        <label class="field">
          <span class="field-label">{{ t('auth.newpw.ph') }}</span>
          <span class="pw-wrap">
            <input
              v-model="password" :type="showPw ? 'text' : 'password'"
              autocomplete="new-password" :placeholder="t('auth.newpw.ph')" class="field-input"
            >
            <button
              type="button" class="pw-toggle"
              :aria-label="showPw ? t('auth.pw.hide') : t('auth.pw.show')"
              @click="showPw = !showPw"
            >
              <svg v-if="!showPw" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
            </button>
          </span>
        </label>

        <p v-if="errorMsg" class="reset-error">{{ errorMsg }}</p>

        <button type="submit" class="primary-btn" :disabled="busy">{{ busy ? t('auth.processing') : t('auth.newpw.submit') }}</button>
      </form>

      <NuxtLink :to="localePath('/login')" class="back-link">{{ t('auth.reset.back') }}</NuxtLink>
    </div>
  </main>
</template>

<style scoped>
.reset-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 110px var(--space-6) var(--space-16);
}
.reset-card {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-10) var(--space-8);
  background: var(--bg-secondary);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-deep), var(--shadow-inset);
  text-align: center;
}
.seal {
  align-self: center;
  display: inline-flex;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-md);
  background: rgba(10, 10, 15, 0.35);
}
.seal span { font-family: var(--font-display); font-weight: 700; font-size: 1.4rem; color: var(--gold-light); }
.reset-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  letter-spacing: -0.02em;
}
.reset-form { display: flex; flex-direction: column; gap: var(--space-4); text-align: left; }
.field { display: flex; flex-direction: column; gap: 7px; }
.field-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.field-input {
  width: 100%;
  padding: 13px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold-border);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: var(--text-sm);
}
.field-input:focus { outline: none; border-color: var(--gold-primary); box-shadow: 0 0 0 3px var(--gold-soft); }
.pw-wrap { position: relative; display: block; }
.pw-wrap .field-input { padding-right: 46px; }
.pw-toggle {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition: color 0.2s;
}
.pw-toggle:hover { color: var(--gold-light); }
.primary-btn {
  width: 100%;
  padding: 14px 18px;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold-primary);
  background: var(--gold-primary);
  color: var(--text-on-gold);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 700;
  transition: transform 0.15s var(--ease-out), box-shadow 0.2s;
  box-shadow: 0 4px 16px rgba(201, 168, 76, 0.20);
}
.primary-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(201, 168, 76, 0.30); }
.primary-btn:disabled { opacity: 0.6; cursor: progress; transform: none; box-shadow: none; }
.reset-error {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--danger, #DC2626);
  border-radius: var(--radius-md);
  background: rgba(220, 38, 38, 0.08);
  color: #F87171;
  font-size: var(--text-sm);
  line-height: 1.5;
}
.reset-ok {
  padding: var(--space-4);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-md);
  background: var(--gold-soft);
  color: var(--gold-light);
  font-size: var(--text-sm);
  line-height: 1.6;
}
.back-link {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.back-link:hover { color: var(--gold-primary); }
</style>
