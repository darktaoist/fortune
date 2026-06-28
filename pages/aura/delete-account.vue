<script setup>
// AURA 앱 계정 삭제 요청 — 1.0 AuraDeleteAccount.vue 포팅. 플레이스토어 필수 URL(/aura/delete-account).
// 4개국어: 안내 prose는 granular 키, 폼 label/placeholder/에러/메일도 키. 메일 본문은 {email}{provider}{reason} 보간.
definePageMeta({ layout: false })
const { t } = useI18n()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('aura.delete.seoTitle'), robots: 'noindex, nofollow' })
const router = useRouter()

const submitted = ref(false)
const error = ref('')
const form = reactive({ email: '', provider: '', reason: '' })

function submitRequest() {
  if (!form.email || !form.provider) {
    error.value = t('aura.delete.errRequired')
    return
  }
  error.value = ''
  const subject = encodeURIComponent(t('aura.delete.mailSubject'))
  const body = encodeURIComponent(
    t('aura.delete.mailBody', {
      email: form.email,
      provider: form.provider,
      reason: form.reason || t('aura.delete.reasonEmpty'),
    }),
  )
  window.location.href = `mailto:help@taoist.co.kr?subject=${subject}&body=${body}`
  submitted.value = true
}
</script>

<template>
  <div class="legal-page">
    <AuraLangSwitch />
    <div class="legal-header">
      <span class="back-btn" @click="router.back()">{{ t('aura.legal.back') }}</span>
      <h1>{{ t('aura.delete.h1') }}</h1>
      <span class="app-badge">{{ t('aura.legal.badge') }}</span>
    </div>

    <div class="legal-body">
      <div class="disclaimer-box" style="margin-bottom: 32px">
        <strong>{{ t('aura.delete.warnTitle') }}</strong>
        {{ t('aura.delete.warnDesc') }}
      </div>

      <section>
        <h2>{{ t('aura.delete.dataTitle') }}</h2>
        <ul>
          <li>{{ t('aura.delete.data1') }}</li>
          <li>{{ t('aura.delete.data2') }}</li>
          <li>{{ t('aura.delete.data3') }}</li>
          <li>{{ t('aura.delete.data4') }}</li>
        </ul>
        <p v-html="t('aura.delete.period.html')"></p>
      </section>

      <section>
        <h2>{{ t('aura.delete.m1Title') }}</h2>
        <p v-html="t('aura.delete.m1Desc.html')"></p>
      </section>

      <section>
        <h2>{{ t('aura.delete.m2Title') }}</h2>
        <p>{{ t('aura.delete.m2Desc') }}</p>

        <div v-if="!submitted" class="delete-form">
          <div class="form-group">
            <label>{{ t('aura.delete.fEmail') }} <span class="required">*</span></label>
            <input v-model="form.email" type="email" :placeholder="t('aura.delete.fEmailPh')" />
          </div>
          <div class="form-group">
            <label>{{ t('aura.delete.fProvider') }} <span class="required">*</span></label>
            <select v-model="form.provider">
              <option value="">{{ t('aura.delete.fProviderPh') }}</option>
              <option value="google">Google</option>
              <option value="kakao">Kakao</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ t('aura.delete.fReason') }}</label>
            <textarea v-model="form.reason" rows="3" :placeholder="t('aura.delete.fReasonPh')"></textarea>
          </div>

          <p v-if="error" class="form-error">{{ error }}</p>

          <button class="delete-btn" @click="submitRequest">{{ t('aura.delete.submit') }}</button>
        </div>

        <div v-else class="submitted-msg">
          <p>{{ t('aura.delete.okMsg1') }}</p>
          <p>{{ t('aura.delete.okMsg2') }}</p>
          <button class="reset-btn" @click="submitted = false">{{ t('aura.delete.reset') }}</button>
        </div>
      </section>

      <div class="footer-links">
        <NuxtLink :to="localePath('/aura')">{{ t('aura.nav.home') }}</NuxtLink>
        <NuxtLink :to="localePath('/aura/privacy')">{{ t('aura.nav.privacy') }}</NuxtLink>
        <NuxtLink :to="localePath('/aura/support')">{{ t('aura.nav.support') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style src="~/assets/css/aura-legal.css"></style>

<style scoped>
.delete-form {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 24px;
  margin-top: 16px;
}

.form-group { margin-bottom: 18px; }
.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #444;
  margin-bottom: 6px;
}
.form-group .required { color: #e53e3e; }
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 15px;
  font-family: inherit;
  box-sizing: border-box;
  color: #333;
  background: #fff;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #555;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.06);
}
.form-group textarea { resize: vertical; }

.form-error {
  color: #e53e3e;
  font-size: 14px;
  margin-bottom: 12px;
}

.delete-btn {
  background: #333;
  color: #fff;
  border: none;
  padding: 12px 28px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
}
.delete-btn:hover { background: #555; }

.submitted-msg {
  background: #f0fff4;
  border: 1px solid #9ae6b4;
  border-radius: 8px;
  padding: 20px 24px;
}
.submitted-msg p { color: #276749; font-size: 15px; margin: 6px 0; }

.reset-btn {
  margin-top: 12px;
  background: none;
  border: 1px solid #aaa;
  padding: 8px 18px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  color: #555;
}
.reset-btn:hover { background: #f0f0f0; }
</style>
