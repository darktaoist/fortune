<script setup>
// AURA 앱 이용약관 — 1.0 AuraTerms.vue 포팅.
definePageMeta({ layout: false })
useSeoMeta({ title: '이용약관 | AURA', robots: 'noindex, nofollow' })
const router = useRouter()
</script>

<template>
  <div class="legal-page">
    <div class="legal-header">
      <span class="back-btn" @click="router.back()">← 뒤로</span>
      <h1>이용약관</h1>
      <span class="app-badge">Aura 앱</span>
    </div>

    <div class="legal-body">
      <p class="intro">본 약관은 돌마당소프트(이하 "회사")가 제공하는 <strong>아우라(Aura)</strong> 앱 서비스(이하 "서비스")의 이용에 관한 회사와 이용자 간의 권리·의무 및 책임사항을 규정합니다.</p>

      <section>
        <h2>제1장 총칙</h2>
        <p><strong>제1조(목적)</strong> 본 약관은 Aura 앱 서비스 이용에 관한 회사와 이용자 간의 제반 사항을 규정함을 목적으로 합니다.</p>
        <p><strong>제2조(용어 정의)</strong> "회원"이란 본 약관에 동의하고 서비스를 이용하는 자를 말하며, "콘텐츠"란 회사가 제공하는 AI 관상·손금 분석 결과물을 의미합니다.</p>
        <p><strong>제3조(약관의 효력 및 변경)</strong> 본 약관은 앱 내 공지로 효력이 발생하며, 중요한 변경 사항은 시행 30일 전, 그 외 변경 사항은 7일 전 공지합니다.</p>
      </section>

      <section>
        <h2>제2장 회원의 권리와 의무</h2>
        <p><strong>제4조(회원의 권리)</strong> 회원은 서비스를 자유롭게 이용할 수 있으며, 개인정보와 콘텐츠를 보호받을 권리가 있습니다.</p>
        <p><strong>제5조(회원의 의무)</strong> 회원은 계정정보를 안전하게 관리하고, 다음 행위를 하여서는 안 됩니다.</p>
        <ul>
          <li>서비스를 이용한 불법 행위</li>
          <li>타인의 개인정보 무단 수집 또는 사용</li>
          <li>서비스 정상 운영 방해</li>
          <li>회사 명예 훼손 또는 법령 위반</li>
        </ul>
      </section>

      <section>
        <h2>제3장 서비스 이용</h2>
        <p><strong>제6조(서비스 내용)</strong> 회사는 다음 서비스를 제공합니다.</p>
        <ul>
          <li>AI 관상·손금 분석 콘텐츠 (온디바이스 처리)</li>
          <li>개인 맞춤형 분석 정보 제공</li>
          <li>분석 결과 저장 및 조회 (로그인 회원)</li>
        </ul>
        <p><strong>제7조(서비스 이용 제한)</strong> 시스템 점검, 법령 위반, 회원의 의무 위반 시 서비스 전부 또는 일부를 제한하거나 중단할 수 있습니다.</p>
      </section>

      <section>
        <h2>제4장 계약 해제·해지 및 환불</h2>
        <p><strong>제8조(계약 해지)</strong> 회원은 언제든지 계정 삭제를 통해 서비스 이용계약을 해지할 수 있습니다. 계정 삭제 시 모든 데이터는 영구 삭제됩니다.</p>
        <p><strong>제9조(환불 정책)</strong></p>
        <ul>
          <li>콘텐츠 미열람 상태: 구매일로부터 7일 이내 전액 환불</li>
          <li>콘텐츠 열람 후: 전자상거래 소비자보호법에 따라 청약철회 제한</li>
          <li>서비스 미제공 시: 전액 환불</li>
        </ul>
        <p>환불 요청: <strong>help@taoist.co.kr</strong> (접수 후 3영업일 이내 처리)</p>
      </section>

      <section>
        <h2>제5장 면책 조항</h2>
        <div class="disclaimer-box">
          <strong>⚠️ 분석 결과의 성격에 관한 중요 고지</strong>
          본 앱이 제공하는 AI 관상·손금 분석 결과는 <strong>전통 관상학·수상학에 기반한 엔터테인먼트 콘텐츠</strong>이며, 의학적·법적·재정적 조언이 아닙니다. 분석 결과를 중요한 의사결정의 근거로 사용하지 마시고, 참고용으로만 활용하시기 바랍니다.
        </div>
        <p style="margin-top:16px">천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 회사는 책임지지 않습니다.</p>
      </section>

      <section>
        <h2>제6장 기타</h2>
        <p><strong>제10조(준거법 및 분쟁 해결)</strong> 본 약관은 대한민국 법령에 따라 해석되며, 분쟁 발생 시 회사 본사 소재지 관할 법원을 제1심 법원으로 합니다.</p>
        <p>공고일자: 2026년 4월 26일 &nbsp;|&nbsp; 시행일자: 2026년 5월 3일</p>
      </section>

      <div class="footer-links">
        <NuxtLink to="/aura">← Aura 홈</NuxtLink>
        <NuxtLink to="/aura/privacy">개인정보처리방침</NuxtLink>
        <NuxtLink to="/aura/support">지원/문의</NuxtLink>
        <NuxtLink to="/aura/delete-account">계정 삭제</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style src="~/assets/css/aura-legal.css"></style>
