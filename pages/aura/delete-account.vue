<script setup>
// AURA 앱 계정 삭제 요청 — 1.0 AuraDeleteAccount.vue 포팅(options API → script setup).
// 플레이스토어 필수 URL(/aura/delete-account).
definePageMeta({ layout: false })
useSeoMeta({ title: '계정 삭제 요청 | AURA', robots: 'noindex, nofollow' })
const router = useRouter()

const submitted = ref(false)
const error = ref('')
const form = reactive({ email: '', provider: '', reason: '' })

function submitRequest() {
  if (!form.email || !form.provider) {
    error.value = '이메일 주소와 소셜 계정 종류는 필수 입력 항목입니다.'
    return
  }
  error.value = ''
  const subject = encodeURIComponent('[Aura] 계정 삭제 요청')
  const body = encodeURIComponent(
    `계정 삭제를 요청합니다.\n\n가입 이메일: ${form.email}\n소셜 계정: ${form.provider}\n삭제 사유: ${form.reason || '미입력'}\n\n---\nAura 앱 계정 삭제 요청`
  )
  window.location.href = `mailto:help@taoist.co.kr?subject=${subject}&body=${body}`
  submitted.value = true
}
</script>

<template>
  <div class="legal-page">
    <div class="legal-header">
      <span class="back-btn" @click="router.back()">← 뒤로</span>
      <h1>계정 삭제 요청</h1>
      <span class="app-badge">Aura 앱</span>
    </div>

    <div class="legal-body">
      <div class="disclaimer-box" style="margin-bottom: 32px">
        <strong>⚠️ 삭제 전 반드시 확인하세요</strong>
        계정 삭제는 영구적이며 복구할 수 없습니다. 아래 데이터가 모두 삭제됩니다.
      </div>

      <section>
        <h2>삭제되는 데이터</h2>
        <ul>
          <li>Supabase에 저장된 모든 관상·손금 분석 결과 및 기록</li>
          <li>프로필 정보 (이메일 주소, 표시 이름)</li>
          <li>Google / Kakao OAuth 연동 정보</li>
          <li>결제 이력 및 구매한 콘텐츠 이용 권한</li>
        </ul>
        <p>처리 기간: 요청 접수 후 <strong>영업일 기준 7일 이내</strong> 완료됩니다.</p>
      </section>

      <section>
        <h2>방법 1 — 앱에서 직접 삭제</h2>
        <p>앱 내 <strong>설정 → 계정 → 계정 삭제</strong> 메뉴를 이용하면 즉시 삭제 절차가 시작됩니다. (가장 빠른 방법)</p>
      </section>

      <section>
        <h2>방법 2 — 이메일로 삭제 요청</h2>
        <p>앱을 사용할 수 없는 경우 아래 양식을 작성하여 이메일로 요청하세요.</p>

        <div v-if="!submitted" class="delete-form">
          <div class="form-group">
            <label>가입 이메일 주소 <span class="required">*</span></label>
            <input v-model="form.email" type="email" placeholder="example@email.com" />
          </div>
          <div class="form-group">
            <label>가입 시 사용한 소셜 계정 <span class="required">*</span></label>
            <select v-model="form.provider">
              <option value="">선택하세요</option>
              <option value="google">Google</option>
              <option value="kakao">Kakao</option>
            </select>
          </div>
          <div class="form-group">
            <label>삭제 사유 (선택)</label>
            <textarea v-model="form.reason" rows="3" placeholder="삭제 사유를 입력하시면 서비스 개선에 도움이 됩니다."></textarea>
          </div>

          <p v-if="error" class="form-error">{{ error }}</p>

          <button class="delete-btn" @click="submitRequest">삭제 요청 이메일 보내기</button>
        </div>

        <div v-else class="submitted-msg">
          <p>✅ 이메일 클라이언트가 열립니다. 작성된 내용을 확인 후 전송해 주세요.</p>
          <p>전송 완료 후 영업일 기준 7일 이내에 처리 결과를 안내드립니다.</p>
          <button class="reset-btn" @click="submitted = false">다시 작성</button>
        </div>
      </section>

      <div class="footer-links">
        <NuxtLink to="/aura">← Aura 홈</NuxtLink>
        <NuxtLink to="/aura/privacy">개인정보처리방침</NuxtLink>
        <NuxtLink to="/aura/support">지원/문의</NuxtLink>
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
