<script setup>
// AURA 앱 지원/문의 — 1.0 AuraSupport.vue 포팅(options API → script setup).
definePageMeta({ layout: false })
useSeoMeta({ title: '지원/문의 | AURA', robots: 'noindex, nofollow' })
const router = useRouter()

const openIdx = ref(null)
function toggle(i) { openIdx.value = openIdx.value === i ? null : i }

const faqs = [
  {
    q: '내 사진이 서버에 저장되나요?',
    a: '아니요. 관상·손금 분석을 위한 원본 얼굴·손 이미지는 서버로 전송되지 않습니다. 모든 이미지 분석은 Google Gemma 온디바이스 AI를 통해 이용자의 기기 내에서만 처리됩니다. 결과 저장을 선택하신 경우에만 분석 결과 텍스트와 랜드마크 좌표 데이터가 Supabase에 저장됩니다.',
  },
  {
    q: '결과를 저장하려면 로그인이 꼭 필요한가요?',
    a: '네, 분석 결과 저장 및 나중에 다시 보기 기능은 Google 또는 Kakao 계정으로 로그인한 회원에게만 제공됩니다. 로그인 없이도 분석 자체는 무료로 이용하실 수 있습니다.',
  },
  {
    q: '다른 기기에서 내 분석 기록을 볼 수 있나요?',
    a: '네, 로그인 회원의 분석 결과는 Supabase 서버에 저장되므로 동일한 계정으로 다른 기기에서도 조회하실 수 있습니다.',
  },
  {
    q: 'AI 모델이 왜 이렇게 큰가요? 다운로드에 시간이 걸려요.',
    a: '온디바이스 AI(Google Gemma)를 이용자의 기기에서 직접 실행하기 때문에 초기 모델 파일 다운로드(약 1~2GB)가 필요합니다. 이후에는 서버 연결 없이 빠르게 분석이 가능하며, 한 번 다운로드한 후에는 오프라인 상태에서도 분석을 이용하실 수 있습니다.',
  },
  {
    q: '분석 결과가 정확한가요?',
    a: '아우라(Aura)의 관상·손금 분석 결과는 전통 관상학·수상학에 기반한 엔터테인먼트 콘텐츠입니다. 의학적·법적·재정적 판단의 근거로 사용하지 마시고 재미와 참고 목적으로만 활용해 주세요.',
  },
  {
    q: '계정을 삭제하면 어떻게 되나요?',
    a: '계정 삭제 시 Supabase에 저장된 모든 분석 결과, 프로필 정보, OAuth 연동 정보가 영구 삭제됩니다. 삭제된 데이터는 복구할 수 없으므로 신중하게 결정해 주세요. 영업일 기준 7일 이내 처리됩니다.',
  },
  {
    q: '카메라 권한이 왜 필요한가요?',
    a: '관상 분석 시 실시간으로 얼굴을 촬영하거나, 갤러리에서 사진을 선택하기 위해 카메라 또는 사진 접근 권한이 필요합니다. 권한은 분석 기능 사용 시에만 활성화되며, 촬영된 이미지는 기기 밖으로 전송되지 않습니다.',
  },
]
</script>

<template>
  <div class="legal-page">
    <div class="legal-header">
      <span class="back-btn" @click="router.back()">← 뒤로</span>
      <h1>지원 / 문의</h1>
      <span class="app-badge">Aura 앱</span>
    </div>

    <div class="legal-body">
      <section>
        <h2>자주 묻는 질문 (FAQ)</h2>

        <div
          v-for="(item, i) in faqs"
          :key="i"
          class="faq-item"
          @click="toggle(i)"
        >
          <div class="faq-q">
            <span class="faq-icon">{{ openIdx === i ? '▲' : '▼' }}</span>
            {{ item.q }}
          </div>
          <div v-if="openIdx === i" class="faq-a">{{ item.a }}</div>
        </div>
      </section>

      <section>
        <h2>이메일 문의</h2>
        <div class="contact-box">
          <p>서비스 이용 중 문제가 발생하거나 추가 문의 사항이 있으시면 아래로 연락해 주세요.</p>
          <p style="margin-top:12px">
            <strong>지원 이메일</strong>:
            <a href="mailto:help@taoist.co.kr">help@taoist.co.kr</a>
          </p>
          <p>운영 시간: 평일 09:00 ~ 18:00 (KST) &nbsp;|&nbsp; 응답 기간: 영업일 기준 3일 이내</p>
        </div>
      </section>

      <div class="footer-links">
        <NuxtLink to="/aura">← Aura 홈</NuxtLink>
        <NuxtLink to="/aura/privacy">개인정보처리방침</NuxtLink>
        <NuxtLink to="/aura/terms">이용약관</NuxtLink>
        <NuxtLink to="/aura/delete-account">계정 삭제</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style src="~/assets/css/aura-legal.css"></style>

<style scoped>
.faq-item {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  margin-bottom: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s;
}
.faq-item:hover { border-color: #bbb; }

.faq-q {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  background: #fafafa;
}

.faq-icon { font-size: 11px; color: #888; }

.faq-a {
  padding: 14px 18px 16px;
  font-size: 14px;
  line-height: 1.8;
  color: #555;
  background: #fff;
  border-top: 1px solid #eee;
}
</style>
