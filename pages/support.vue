<script setup>
// 문의하기 — ported from 문의하기.html. Submits to /api/inquiry (server saves to
// customer_inquiries via service role and returns a reference number).
const { t, locale } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: () => `${t('contact.title')} · ${t('seo.titleSuffix')}`,
  description: () => t('contact.sub'),
  robots: 'noindex, nofollow',
})

const TYPES = ['general', 'payment', 'input', 'results', 'account', 'etc']
const typeLabel = (v) => (v === 'etc' ? t('contact.type.etc') : t('faq.cat.' + v))

const f = reactive({ name: '', email: '', type: '', subject: '', message: '' })
const agree = ref(false)
const errs = reactive({ name: '', email: '', type: '', subject: '', message: '', agree: '' })
const sending = ref(false)
const done = ref(false)
const refNo = ref('')
const submitErr = ref(false)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function clearErr(k) { errs[k] = '' }

function validate() {
  for (const k in errs) errs[k] = ''
  let firstBad = ''
  const bad = (k, key) => { errs[k] = key; firstBad = firstBad || k }
  if (!f.name.trim()) bad('name', 'contact.err.name')
  if (!f.email.trim()) bad('email', 'contact.err.email')
  else if (!EMAIL_RE.test(f.email.trim())) bad('email', 'contact.err.emailFormat')
  if (!f.type) bad('type', 'contact.err.type')
  if (!f.subject.trim()) bad('subject', 'contact.err.subject')
  if (!f.message.trim()) bad('message', 'contact.err.message')
  if (!agree.value) bad('agree', 'contact.err.agree')
  if (firstBad && import.meta.client) {
    const el = document.querySelector(`[data-field="${firstBad}"]`)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 140
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }
  return !firstBad
}

async function submit() {
  if (!validate() || sending.value) return
  sending.value = true
  submitErr.value = false
  try {
    const res = await $fetch('/api/inquiry', {
      method: 'POST',
      body: { name: f.name, email: f.email, type: f.type, subject: f.subject, message: f.message },
    })
    // 실제 접수(서버 insert) 성공 시에만 성공 화면. 라우트 미등록 등으로 ok/ref가
    // 없으면 거짓 성공을 띄우지 않고 에러로 처리한다.
    if (!res || res.ok !== true || !res.ref) throw new Error('bad response')
    refNo.value = res.ref
    done.value = true
    if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch {
    submitErr.value = true
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <main class="contact-layout">
    <!-- LEFT RAIL -->
    <aside class="rail">
      <div class="page-head">
        <div class="stamp">信</div>
        <h1>{{ t('contact.title') }}</h1>
        <p>{{ t('contact.sub') }}</p>
      </div>
      <div class="faq-hint">
        <span>{{ t('contact.faqHint') }}</span>
        <NuxtLink :to="localePath('/faq')">
          <span>{{ t('contact.faqLink') }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6" /></svg>
        </NuxtLink>
      </div>
      <div class="support-note">
        <span class="nlabel">{{ t('contact.email.label') }}</span>
        <a href="mailto:help@taoist.co.kr">help@taoist.co.kr</a>
      </div>
    </aside>

    <!-- RIGHT: FORM / SUCCESS -->
    <div class="form-col">
      <div class="form-card">
        <form v-if="!done" novalidate @submit.prevent="submit">
          <div class="row2">
            <div class="field" data-field="name" :class="{ invalid: errs.name }">
              <label for="name"><span>{{ t('contact.name.label') }}</span><span class="req">*</span></label>
              <input id="name" v-model="f.name" class="control" type="text" autocomplete="name" :placeholder="t('contact.name.ph')" @input="clearErr('name')" />
              <p class="field-err">{{ errs.name ? t(errs.name) : '' }}</p>
            </div>
            <div class="field" data-field="email" :class="{ invalid: errs.email }">
              <label for="email"><span>{{ t('contact.email.label') }}</span><span class="req">*</span></label>
              <input id="email" v-model="f.email" class="control" type="email" autocomplete="email" :placeholder="t('contact.email.ph')" @input="clearErr('email')" />
              <p class="field-err">{{ errs.email ? t(errs.email) : '' }}</p>
            </div>
          </div>

          <div class="row2">
            <div class="field" data-field="type" :class="{ invalid: errs.type }">
              <label for="type"><span>{{ t('contact.type.label') }}</span><span class="req">*</span></label>
              <div class="select-wrap">
                <select id="type" v-model="f.type" class="control" :class="{ placeholder: !f.type }" @change="clearErr('type')">
                  <option value="" disabled>{{ t('contact.type.ph') }}</option>
                  <option v-for="ty in TYPES" :key="ty" :value="ty">{{ typeLabel(ty) }}</option>
                </select>
                <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              <p class="field-err">{{ errs.type ? t(errs.type) : '' }}</p>
            </div>
            <div class="field" data-field="subject" :class="{ invalid: errs.subject }">
              <label for="subject"><span>{{ t('contact.subject.label') }}</span><span class="req">*</span></label>
              <input id="subject" v-model="f.subject" class="control" type="text" :placeholder="t('contact.subject.ph')" @input="clearErr('subject')" />
              <p class="field-err">{{ errs.subject ? t(errs.subject) : '' }}</p>
            </div>
          </div>

          <div class="field" data-field="message" :class="{ invalid: errs.message }">
            <label for="message"><span>{{ t('contact.message.label') }}</span><span class="req">*</span></label>
            <textarea id="message" v-model="f.message" class="control" maxlength="1000" :placeholder="t('contact.message.ph')" @input="clearErr('message')" />
            <div class="counter" :class="{ max: f.message.length >= 1000 }">{{ f.message.length }} / 1000</div>
            <p class="field-err">{{ errs.message ? t(errs.message) : '' }}</p>
          </div>

          <div class="agree" data-field="agree" :class="{ invalid: errs.agree }">
            <input id="agreeChk" v-model="agree" type="checkbox" @change="agree && clearErr('agree')" />
            <label class="agree-row" for="agreeChk">
              <span class="agree-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg></span>
              <span class="agree-label"><span>{{ t('contact.agree') }}</span><span class="req">*</span></span>
            </label>
            <p class="agree-detail">{{ t('contact.agree.detail') }}</p>
            <p class="agree-err">{{ errs.agree ? t(errs.agree) : '' }}</p>
          </div>

          <p v-if="submitErr" class="submit-err">{{ t('contact.err.submit') }}</p>
          <button type="submit" class="btn btn-primary submit-btn" :disabled="sending">
            <span>{{ sending ? t('contact.sending') : t('contact.submit') }}</span>
          </button>
        </form>

        <!-- SUCCESS -->
        <div v-else class="success show">
          <div class="seal"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12" /></svg></div>
          <h2>{{ t('contact.success.title') }}</h2>
          <p>{{ t('contact.success.sub') }}</p>
          <div class="ref"><span class="lbl">{{ t('contact.success.ref') }}</span><span>{{ refNo }}</span></div>
          <div class="success-actions">
            <NuxtLink class="btn btn-secondary" :to="localePath('/')">{{ t('contact.success.home') }}</NuxtLink>
            <NuxtLink class="btn btn-ghost" :to="localePath('/faq')">{{ t('contact.success.faq') }}</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.contact-layout { max-width: 1140px; margin: 0 auto; padding: 112px var(--space-8) var(--space-24); display: grid; grid-template-columns: 340px 1fr; gap: var(--space-16); align-items: start; }
.rail { position: sticky; top: 108px; display: flex; flex-direction: column; gap: var(--space-6); }

.page-head { text-align: left; }
.page-head .stamp { width: 64px; height: 64px; margin: 0 0 var(--space-6); display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: var(--font-display); font-size: 30px; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(201, 168, 76, 0.30), rgba(201, 168, 76, 0.05)); border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow); }
.page-head h1 { font-family: var(--font-display); font-size: clamp(1.8rem, 2.6vw, 2.3rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; margin-bottom: var(--space-3); }
.page-head p { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.7; text-wrap: pretty; }

.faq-hint { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-3); padding: var(--space-6); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-secondary); font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.6; }
.faq-hint a { display: inline-flex; align-items: center; gap: 5px; color: var(--gold-light); font-weight: 600; white-space: nowrap; }
.faq-hint a:hover { color: var(--gold-primary); }
.support-note { display: flex; flex-direction: column; gap: 6px; padding-top: var(--space-6); border-top: 1px solid var(--gold-border); font-size: var(--text-sm); color: var(--text-secondary); }
.support-note .nlabel { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-muted); }
.support-note a { color: var(--gold-light); font-weight: 600; }

.form-card { background: var(--bg-secondary); border: 1px solid var(--gold-border); border-radius: var(--radius-xl); padding: var(--space-8); box-shadow: var(--shadow-card), var(--shadow-inset); }
@media (max-width: 520px) { .form-card { padding: var(--space-6) var(--space-4); } }

.field { margin-bottom: var(--space-6); }
.field > label { display: block; font-family: var(--font-display); font-size: var(--text-base); font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-3); }
.field > label .req { color: var(--accent-rose); margin-left: 4px; font-family: var(--font-body); }
.control { width: 100%; padding: 14px 16px; border-radius: var(--radius-md); border: 1px solid var(--gold-border); background: var(--bg-primary); color: var(--text-primary); font-family: var(--font-body); font-size: var(--text-base); line-height: 1.6; transition: border-color 0.2s, box-shadow 0.2s; }
.control::placeholder { color: var(--text-muted); }
.control:focus { outline: none; border-color: var(--gold-primary); box-shadow: 0 0 0 3px var(--gold-soft); }
textarea.control { resize: vertical; min-height: 168px; }

.select-wrap { position: relative; }
select.control { appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 44px; }
select.control.placeholder { color: var(--text-muted); }
select.control option { background: var(--bg-elevated); color: var(--text-primary); }
.select-wrap .chev { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }

.field.invalid .control { border-color: var(--danger); box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12); }
.field-err { display: none; margin-top: var(--space-2); font-size: var(--text-sm); color: #f0857d; }
.field.invalid .field-err { display: block; }

.counter { text-align: right; margin-top: var(--space-2); font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
.counter.max { color: var(--gold-primary); }

.agree { margin-bottom: var(--space-6); padding: var(--space-6); border: 1px solid var(--gold-border); border-radius: var(--radius-lg); background: var(--bg-primary); position: relative; }
.agree-row { display: flex; align-items: flex-start; gap: var(--space-3); cursor: pointer; }
.agree-box { flex-shrink: 0; width: 22px; height: 22px; margin-top: 1px; border: 1.5px solid var(--gold-border-strong); border-radius: var(--radius-sm); background: var(--bg-secondary); display: inline-flex; align-items: center; justify-content: center; color: var(--text-on-gold); transition: all 0.18s; }
.agree-box svg { opacity: 0; transform: scale(0.6); transition: all 0.18s; }
.agree input { position: absolute; opacity: 0; width: 0; height: 0; }
.agree input:checked + .agree-row .agree-box { background: linear-gradient(135deg, var(--gold-primary), var(--gold-light)); border-color: var(--gold-primary); }
.agree input:checked + .agree-row .agree-box svg { opacity: 1; transform: scale(1); }
.agree input:focus-visible + .agree-row .agree-box { box-shadow: 0 0 0 3px var(--gold-soft); }
.agree-label { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); line-height: 1.5; }
.agree-label .req { color: var(--accent-rose); margin-left: 3px; }
.agree-detail { margin: var(--space-3) 0 0 calc(22px + var(--space-3)); font-size: var(--text-xs); color: var(--text-muted); line-height: 1.6; }
.agree.invalid { border-color: var(--danger); }
.agree-err { display: none; margin: var(--space-3) 0 0 calc(22px + var(--space-3)); font-size: var(--text-sm); color: #f0857d; }
.agree.invalid .agree-err { display: block; }

.submit-err { margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4); border: 1px solid var(--danger); border-radius: var(--radius-md); background: rgba(220, 38, 38, 0.08); color: #f0857d; font-size: var(--text-sm); text-align: center; }
.submit-btn { width: 100%; padding: var(--space-4); font-size: var(--text-lg); }
.submit-btn:disabled { opacity: 0.7; cursor: progress; transform: none; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; column-gap: var(--space-6); }

.success { display: flex; flex-direction: column; align-items: center; text-align: center; padding: var(--space-12) var(--space-8); }
.success .seal { width: 84px; height: 84px; margin-bottom: var(--space-6); display: flex; align-items: center; justify-content: center; border-radius: 50%; color: var(--gold-light); background: radial-gradient(circle at 35% 30%, rgba(201, 168, 76, 0.30), rgba(201, 168, 76, 0.05)); border: 2px solid var(--gold-border-strong); box-shadow: var(--shadow-glow); }
.success h2 { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-3); }
.success p { color: var(--text-secondary); font-size: var(--text-base); line-height: 1.7; max-width: 420px; }
.success .ref { margin-top: var(--space-6); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gold-light); padding: 8px 16px; border-radius: var(--radius-full); border: 1px solid var(--gold-border); background: var(--gold-soft); }
.success .ref .lbl { color: var(--text-muted); margin-right: 8px; }
.success-actions { display: flex; gap: var(--space-3); margin-top: var(--space-8); flex-wrap: wrap; justify-content: center; }

@media (max-width: 880px) {
  .contact-layout { grid-template-columns: 1fr; gap: var(--space-8); padding: 96px var(--space-6) var(--space-16); max-width: 680px; }
  .rail { position: static; }
  .page-head { text-align: center; }
  .page-head .stamp { margin-left: auto; margin-right: auto; }
  .faq-hint, .support-note { align-items: center; text-align: center; }
}
@media (max-width: 560px) { .row2 { grid-template-columns: 1fr; column-gap: 0; } }
</style>
