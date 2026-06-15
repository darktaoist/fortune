<script setup>
// AURA 앱 개인정보처리방침 — 1.0 AuraPrivacy.vue 포팅. 플레이스토어 필수 URL(/aura/privacy).
definePageMeta({ layout: false })
useSeoMeta({ title: '개인정보처리방침 | AURA', robots: 'noindex, nofollow' })
const router = useRouter()
</script>

<template>
  <div class="legal-page">
    <div class="legal-header">
      <span class="back-btn" @click="router.back()">← 뒤로</span>
      <h1>개인정보처리방침</h1>
      <span class="app-badge">Aura 앱</span>
    </div>

    <div class="legal-body">
      <p class="intro">돌마당소프트(이하 "회사")는 <strong>아우라(Aura)</strong> 앱 서비스 이용자의 개인정보를 중요시하며 개인정보보호법을 준수합니다. 본 방침은 Aura 앱 서비스에만 적용됩니다.</p>

      <section>
        <h2>1. 수집하는 개인정보 항목 및 목적</h2>
        <table>
          <thead><tr><th>항목</th><th>구분</th><th>내용</th><th>비고</th></tr></thead>
          <tbody>
            <tr>
              <td rowspan="2">관상·손금 분석</td>
              <td>비로그인(무료)</td>
              <td>얼굴·손 이미지(온디바이스 처리, 저장 시에만 업로드)</td>
              <td>분석은 기기 내에서만 처리</td>
            </tr>
            <tr>
              <td>로그인(결과 저장)</td>
              <td>이메일, 표시 이름(Google/Kakao OAuth 제공), 분석 결과 텍스트, 랜드마크 좌표</td>
              <td>Supabase에 저장</td>
            </tr>
            <tr>
              <td>오류문의</td>
              <td>-</td>
              <td>이메일 주소</td>
              <td>문의 처리 목적</td>
            </tr>
          </tbody>
        </table>
        <div class="highlight-box">
          <strong>온디바이스 처리 안내</strong>: 관상·손금 분석을 위한 원본 이미지는 서버로 전송되지 않습니다. 분석은 Google Gemma 온디바이스 AI를 통해 이용자 기기 내에서만 이루어집니다.
        </div>
      </section>

      <section>
        <h2>2. 개인정보 보유 및 이용기간</h2>
        <p>분석 결과 저장을 위해 보유하며, 회원 탈퇴 시 지체 없이 파기합니다. 법령에 따라 보존이 필요한 경우 아래 기간 보유합니다.</p>
        <ul>
          <li>표시·광고에 관한 기록: 6개월 (전자상거래 소비자보호법)</li>
          <li>계약 또는 청약철회 기록: 5년 (전자상거래 소비자보호법)</li>
          <li>대금결제 및 재화 공급 기록: 5년 (전자상거래 소비자보호법)</li>
        </ul>
      </section>

      <section>
        <h2>3. 개인정보의 제3자 제공</h2>
        <p>회사는 이용자 동의나 관계법령 근거 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 법령에 따른 수사기관 요청 등 불가피한 경우는 예외입니다.</p>
      </section>

      <section>
        <h2>4. 개인정보 처리 위탁</h2>
        <table>
          <thead><tr><th>구분</th><th>수탁자</th><th>위탁업무</th></tr></thead>
          <tbody>
            <tr><td>인증</td><td>Google LLC</td><td>Google OAuth 소셜 로그인</td></tr>
            <tr><td>인증</td><td>Kakao Corp.</td><td>Kakao OAuth 소셜 로그인</td></tr>
            <tr><td>데이터베이스</td><td>Supabase, Inc.</td><td>회원 정보 및 분석 결과 저장</td></tr>
            <tr><td>결제</td><td>토스페이먼츠</td><td>유료 콘텐츠 결제 대행</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>5. 정보주체의 권리</h2>
        <p>이용자는 언제든지 ① 열람, ② 정정, ③ 삭제, ④ 처리정지를 요구할 수 있습니다. 계정 삭제 및 데이터 삭제 요청은 <NuxtLink to="/aura/delete-account">계정 삭제 요청 페이지</NuxtLink>를 이용하거나 아래 이메일로 문의하세요.</p>
      </section>

      <section>
        <h2>6. 개인정보 파기</h2>
        <p>목적 달성 후 비로그인 이용자 정보는 즉시, 로그인 이용자 정보는 회원 탈퇴 후 관련 법령에 따른 보존 기간 경과 시 파기합니다. 전자 파일은 복원 불가능한 방식으로 삭제합니다.</p>
      </section>

      <section>
        <h2>7. 안전성 확보 조치</h2>
        <p>원본 이미지의 서버 미전송 및 온디바이스 처리 원칙, 소셜 OAuth 기반 계정 관리, Supabase의 암호화 저장 정책을 통해 개인정보 보호 조치를 취하고 있습니다.</p>
      </section>

      <section>
        <h2>8. 개인정보 보호책임자</h2>
        <div class="contact-box">
          <p><strong>이름</strong>: 정송엽 &nbsp;|&nbsp; <strong>직위</strong>: 대표이사</p>
          <p><strong>이메일</strong>: admin@taoist.co.kr</p>
        </div>
      </section>

      <section>
        <h2>9. 변경 이력</h2>
        <p>공고일자: 2026년 4월 26일 &nbsp;|&nbsp; 시행일자: 2026년 5월 3일</p>
      </section>

      <div class="footer-links">
        <NuxtLink to="/aura">← Aura 홈</NuxtLink>
        <NuxtLink to="/aura/terms">이용약관</NuxtLink>
        <NuxtLink to="/aura/support">지원/문의</NuxtLink>
        <NuxtLink to="/aura/delete-account">계정 삭제</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style src="~/assets/css/aura-legal.css"></style>
