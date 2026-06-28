<script setup>
// AURA 앱 랜딩 — 1.0 AuraLanding.vue 포팅. standalone(별도 제품), 마케팅 페이지라 index 허용.
// 4개국어(ko·en·ja·zh): 텍스트는 aura.lp.* 평면 키, 코너 스위처/hreflang/자동감지는 <AuraLangSwitch/>.
definePageMeta({ layout: false })
const { t } = useI18n()
const localePath = useLocalePath()
useSeoMeta({
  title: () => t('aura.lp.seoTitle'),
  description: () => t('aura.lp.seoDesc'),
  ogTitle: () => t('aura.lp.ogTitle'),
  ogDescription: () => t('aura.lp.ogDesc'),
  robots: 'index, follow',
})
</script>

<template>
  <div class="aura-landing">
    <AuraLangSwitch />

    <!-- ─── HERO ─────────────────────────────── -->
    <section class="hero">
      <div class="hero-bg-glow"></div>
      <div class="hero-topbar">
        <span class="hero-logo">AURA</span>
        <NuxtLink :to="localePath('/')" class="taounse-link">{{ t('aura.lp.taounse.nav') }}</NuxtLink>
      </div>
      <div class="hero-inner">
        <div class="hero-text">
          <p class="hero-eyebrow">{{ t('aura.lp.hero.eyebrow') }}</p>
          <h1>{{ t('aura.lp.hero.title') }}</h1>
          <p class="hero-desc">
            <span v-html="t('aura.lp.hero.desc.html')"></span><br>
            <span class="free-badge">{{ t('aura.lp.hero.freeBadge') }}</span>
            <span class="privacy-badge">{{ t('aura.lp.hero.privacyBadge') }}</span>
          </p>
          <div class="cta-group">
            <a href="https://play.google.com/store/apps/details?id=kr.co.taoist.gwansang" class="cta-btn" target="_blank" rel="noopener noreferrer">
              <img src="/aura/googleplay.png" alt="" class="store-icon" />
              {{ t('aura.lp.install') }}
            </a>
          </div>
        </div>
        <div class="hero-phone">
          <div class="phone-frame">
            <img src="/aura/1.jpg" :alt="t('aura.lp.hero.phoneAlt')" />
          </div>
          <div class="phone-glow"></div>
        </div>
      </div>
      <div class="hero-scroll-hint">↓</div>
    </section>

    <!-- ─── STATS BAR ────────────────────────────── -->
    <section class="stats-bar">
      <div class="stats-inner">
        <div class="stat-item">
          <span class="stat-num">468</span>
          <span class="stat-label">{{ t('aura.lp.stats.face') }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-num">21</span>
          <span class="stat-label">{{ t('aura.lp.stats.hand') }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-num">1,000<span class="stat-unit">{{ t('aura.lp.stats.reportUnit') }}</span></span>
          <span class="stat-label">{{ t('aura.lp.stats.report') }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-num">4</span>
          <span class="stat-label">{{ t('aura.lp.stats.lang') }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-num">0<span class="stat-unit">byte</span></span>
          <span class="stat-label">{{ t('aura.lp.stats.cloud') }}</span>
        </div>
      </div>
    </section>

    <!-- ─── FEATURE 1: AI 관상 ─────────────────── -->
    <section class="feature feature--right">
      <div class="feature-inner">
        <div class="feature-phone">
          <div class="phone-frame phone-frame--sm">
            <img src="/aura/2.jpg" :alt="t('aura.lp.f1.alt')" />
          </div>
          <div class="feature-badge">相</div>
        </div>
        <div class="feature-text">
          <p class="feature-eyebrow">{{ t('aura.lp.f1.eyebrow') }}</p>
          <h2 v-html="t('aura.lp.f1.title.html')"></h2>
          <p class="feature-desc">{{ t('aura.lp.f1.desc') }}</p>
          <ul class="feature-points">
            <li>{{ t('aura.lp.f1.p1') }}</li>
            <li>{{ t('aura.lp.f1.p2') }}</li>
            <li>{{ t('aura.lp.f1.p3') }}</li>
            <li>{{ t('aura.lp.f1.p4') }}</li>
            <li>{{ t('aura.lp.f1.p5') }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ─── FEATURE 2: AI 손금 ─────────────────── -->
    <section class="feature feature--left feature--dark">
      <div class="feature-inner">
        <div class="feature-text">
          <p class="feature-eyebrow">{{ t('aura.lp.f2.eyebrow') }}</p>
          <h2 v-html="t('aura.lp.f2.title.html')"></h2>
          <p class="feature-desc">{{ t('aura.lp.f2.desc') }}</p>
          <ul class="feature-points">
            <li>{{ t('aura.lp.f2.p1') }}</li>
            <li>{{ t('aura.lp.f2.p2') }}</li>
            <li>{{ t('aura.lp.f2.p3') }}</li>
            <li>{{ t('aura.lp.f2.p4') }}</li>
          </ul>
        </div>
        <div class="feature-phone">
          <div class="phone-frame phone-frame--sm">
            <img src="/aura/3.jpg" :alt="t('aura.lp.f2.alt')" />
          </div>
          <div class="feature-badge">掌</div>
        </div>
      </div>
    </section>

    <!-- ─── FEATURE 3: AI 상담 ─────────────────── -->
    <section class="feature feature--right">
      <div class="feature-inner">
        <div class="feature-phone">
          <div class="phone-frame phone-frame--sm">
            <img src="/aura/4.jpg" :alt="t('aura.lp.f3.alt')" />
          </div>
          <div class="feature-badge">談</div>
        </div>
        <div class="feature-text">
          <p class="feature-eyebrow">{{ t('aura.lp.f3.eyebrow') }}</p>
          <h2 v-html="t('aura.lp.f3.title.html')"></h2>
          <p class="feature-desc">{{ t('aura.lp.f3.desc') }}</p>
          <ul class="feature-points">
            <li>{{ t('aura.lp.f3.p1') }}</li>
            <li>{{ t('aura.lp.f3.p2') }}</li>
            <li>{{ t('aura.lp.f3.p3') }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ─── REPORT 섹션 ─────────────────────────── -->
    <section class="report-section">
      <div class="report-inner">
        <div class="report-text">
          <p class="feature-eyebrow">{{ t('aura.lp.report.eyebrow') }}</p>
          <h2 v-html="t('aura.lp.report.title.html')"></h2>
          <p class="feature-desc">{{ t('aura.lp.report.desc') }}</p>
          <div class="trust-score">
            <span class="trust-label">{{ t('aura.lp.report.trustLabel') }}</span>
            <span class="trust-value">100</span>
          </div>
          <p class="report-cta-note">{{ t('aura.lp.report.ctaNote') }}</p>
        </div>
        <div class="report-phone">
          <div class="phone-frame phone-frame--sm">
            <img src="/aura/4.jpg" :alt="t('aura.lp.report.alt')" />
          </div>
        </div>
      </div>
    </section>

    <!-- ─── PRIVACY (온디바이스) ──────────────────── -->
    <section class="privacy-section">
      <div class="privacy-inner">
        <div class="privacy-icon-wrap">
          <span class="privacy-big-icon">🔒</span>
        </div>
        <h2 v-html="t('aura.lp.privacy.title.html')"></h2>
        <p v-html="t('aura.lp.privacy.desc.html')"></p>
        <div class="privacy-chips">
          <span class="chip">{{ t('aura.lp.privacy.chip1') }}</span>
          <span class="chip">{{ t('aura.lp.privacy.chip2') }}</span>
          <span class="chip">{{ t('aura.lp.privacy.chip3') }}</span>
          <span class="chip">{{ t('aura.lp.privacy.chip4') }}</span>
        </div>
      </div>
    </section>

    <!-- ─── TECH STACK ──────────────────────────── -->
    <section class="tech-section">
      <div class="tech-inner">
        <p class="feature-eyebrow" style="text-align:center">{{ t('aura.lp.tech.eyebrow') }}</p>
        <h2 class="tech-title" v-html="t('aura.lp.tech.title.html')"></h2>
        <div class="tech-grid">
          <div class="tech-card">
            <span class="tech-icon">🤖</span>
            <span class="tech-name">Google Gemma 4</span>
            <span class="tech-desc" v-html="t('aura.lp.tech.t1.desc.html')"></span>
          </div>
          <div class="tech-card">
            <span class="tech-icon">👁️</span>
            <span class="tech-name">Google ML Kit</span>
            <span class="tech-desc" v-html="t('aura.lp.tech.t2.desc.html')"></span>
          </div>
          <div class="tech-card">
            <span class="tech-icon">📱</span>
            <span class="tech-name">Flutter</span>
            <span class="tech-desc" v-html="t('aura.lp.tech.t3.desc.html')"></span>
          </div>
          <div class="tech-card">
            <span class="tech-icon">🗄️</span>
            <span class="tech-name">Supabase</span>
            <span class="tech-desc" v-html="t('aura.lp.tech.t4.desc.html')"></span>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── 2-COLUMN: 기록 + 로그인 ──────────────── -->
    <section class="duo-section">
      <div class="duo-inner">

        <div class="duo-card">
          <div class="phone-frame phone-frame--sm">
            <img src="/aura/7.jpg" :alt="t('aura.lp.duo1.alt')" />
          </div>
          <div class="duo-card-text">
            <h3 v-html="t('aura.lp.duo1.title.html')"></h3>
            <p>{{ t('aura.lp.duo1.desc') }}</p>
          </div>
        </div>

        <div class="duo-card">
          <div class="phone-frame phone-frame--sm">
            <img src="/aura/5.jpg" :alt="t('aura.lp.duo2.alt')" />
          </div>
          <div class="duo-card-text">
            <h3 v-html="t('aura.lp.duo2.title.html')"></h3>
            <p>{{ t('aura.lp.duo2.desc') }}</p>
          </div>
        </div>

      </div>
    </section>

    <!-- ─── ROADMAP ─────────────────────────────── -->
    <section class="roadmap-section">
      <div class="roadmap-inner">
        <p class="feature-eyebrow" style="text-align:center">{{ t('aura.lp.roadmap.eyebrow') }}</p>
        <h2 class="roadmap-title">{{ t('aura.lp.roadmap.title') }}</h2>
        <div class="roadmap-grid">
          <div class="roadmap-card roadmap-card--done">
            <span class="roadmap-status">{{ t('aura.lp.roadmap.doneLabel') }}</span>
            <h4>{{ t('aura.lp.roadmap.r1.title') }}</h4>
            <p>{{ t('aura.lp.roadmap.r1.desc') }}</p>
          </div>
          <div class="roadmap-card roadmap-card--done">
            <span class="roadmap-status">{{ t('aura.lp.roadmap.doneLabel') }}</span>
            <h4>{{ t('aura.lp.roadmap.r2.title') }}</h4>
            <p>{{ t('aura.lp.roadmap.r2.desc') }}</p>
          </div>
          <div class="roadmap-card roadmap-card--done">
            <span class="roadmap-status">{{ t('aura.lp.roadmap.doneLabel') }}</span>
            <h4>{{ t('aura.lp.roadmap.r3.title') }}</h4>
            <p>{{ t('aura.lp.roadmap.r3.desc') }}</p>
          </div>
          <div class="roadmap-card roadmap-card--wip">
            <span class="roadmap-status">{{ t('aura.lp.roadmap.wipLabel') }}</span>
            <h4>{{ t('aura.lp.roadmap.r4.title') }}</h4>
            <p>{{ t('aura.lp.roadmap.r4.desc') }}</p>
          </div>
          <div class="roadmap-card roadmap-card--plan">
            <span class="roadmap-status">{{ t('aura.lp.roadmap.planLabel') }}</span>
            <h4>{{ t('aura.lp.roadmap.r5.title') }}</h4>
            <p>{{ t('aura.lp.roadmap.r5.desc') }}</p>
          </div>
          <div class="roadmap-card roadmap-card--plan">
            <span class="roadmap-status">{{ t('aura.lp.roadmap.planLabel') }}</span>
            <h4>{{ t('aura.lp.roadmap.r6.title') }}</h4>
            <p>{{ t('aura.lp.roadmap.r6.desc') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── 다국어 + 설정 ──────────────────────── -->
    <section class="settings-section">
      <div class="settings-inner">
        <div class="settings-text">
          <p class="feature-eyebrow">{{ t('aura.lp.settings.eyebrow') }}</p>
          <h2 v-html="t('aura.lp.settings.title.html')"></h2>
          <div class="lang-list">
            <span class="lang-item">🇰🇷 한국어</span>
            <span class="lang-item">🇺🇸 English</span>
            <span class="lang-item">🇨🇳 中文</span>
            <span class="lang-item">🇯🇵 日本語</span>
          </div>
          <p class="feature-desc" style="margin-top:24px">{{ t('aura.lp.settings.desc') }}</p>
        </div>
        <div class="settings-phone">
          <div class="phone-frame phone-frame--sm">
            <img src="/aura/6.jpg" :alt="t('aura.lp.settings.alt')" />
          </div>
        </div>
      </div>
    </section>

    <!-- ─── CTA FOOTER ─────────────────────────── -->
    <section class="cta-footer">
      <div class="cta-footer-glow"></div>
      <div class="cta-footer-inner">
        <p class="cta-eyebrow">{{ t('aura.lp.cta.eyebrow') }}</p>
        <h2 v-html="t('aura.lp.cta.title.html')"></h2>
        <a href="https://play.google.com/store/apps/details?id=kr.co.taoist.gwansang" class="cta-btn cta-btn--lg" target="_blank" rel="noopener noreferrer">
          <img src="/aura/googleplay.png" alt="" class="store-icon" />
          {{ t('aura.lp.install') }}
        </a>
        <a href="https://github.com/darktaoist/aura" class="github-btn" target="_blank" rel="noopener noreferrer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          {{ t('aura.lp.cta.github') }}
        </a>
        <NuxtLink :to="localePath('/')" class="taounse-footer-link">{{ t('aura.lp.taounse.footer') }}</NuxtLink>
        <div class="footer-legal-links">
          <NuxtLink :to="localePath('/aura/privacy')">{{ t('aura.nav.privacy') }}</NuxtLink>
          <span class="divider">|</span>
          <NuxtLink :to="localePath('/aura/terms')">{{ t('aura.nav.terms') }}</NuxtLink>
          <span class="divider">|</span>
          <NuxtLink :to="localePath('/aura/support')">{{ t('aura.nav.support') }}</NuxtLink>
          <span class="divider">|</span>
          <NuxtLink :to="localePath('/aura/delete-account')">{{ t('aura.nav.delete') }}</NuxtLink>
        </div>
        <p class="footer-copy">{{ t('aura.lp.cta.copy') }}</p>
      </div>
    </section>

  </div>
</template>

<style lang="scss" scoped>
// ─── 토큰 ──────────────────────────────────────
$bg-deep:   #0a0a0f;
$bg-card:   #111118;
$bg-mid:    #141420;
$gold:      #c9a84c;
$gold-lt:   #e8c97e;
$gold-dim:  #7a6230;
$text:      #e8e4dc;
$text-muted:#8a8070;
$radius:    20px;

// ─── 공통 ──────────────────────────────────────
.aura-landing {
  background: $bg-deep;
  color: $text;
  font-family: 'Noto Sans KR', sans-serif;
  overflow-x: hidden;
}

.feature-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: $gold;
  margin: 0 0 12px;
}

.feature-desc {
  font-size: 15px;
  line-height: 1.9;
  color: $text-muted;
  margin: 16px 0 0;
}

// ─── 폰 목업 ──────────────────────────────────
.phone-frame {
  border-radius: 28px;
  overflow: hidden;
  border: 1.5px solid rgba($gold, 0.25);
  box-shadow:
    0 0 40px rgba($gold, 0.08),
    0 24px 60px rgba(0,0,0,0.6);
  position: relative;

  img {
    display: block;
    width: 100%;
    height: auto;
  }

  &--sm { max-width: 220px; }
}

// ─── HERO ──────────────────────────────────────
.hero {
  position: relative;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px 40px 80px;
  overflow: hidden;
}

.hero-topbar {
  position: absolute;
  top: 24px;
  left: 40px;
  display: flex;
  align-items: center;
  gap: 18px;            // AURA 로고 + 타오운세 링크를 좌측에 나란히(우측 상단 언어 스위처와 겹치지 않게)
  z-index: 10;

  @media (max-width: 860px) { left: 24px; gap: 12px; }
}

// 타오운세(웹 운세)로 보내는 골드 고스트 버튼 — Play CTA(꽉 찬 골드)와 구분.
.taounse-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: $gold-lt;
  border: 1px solid rgba($gold, 0.35);
  border-radius: 999px;
  background: rgba($gold, 0.06);
  transition: background 0.18s, border-color 0.18s;

  &:hover { background: rgba($gold, 0.16); border-color: rgba($gold, 0.6); }
  @media (max-width: 860px) { font-size: 13px; padding: 7px 13px; }
}

.hero-logo {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 6px;
  color: $gold;
  font-family: 'Noto Sans KR', sans-serif;
}

.hero-bg-glow {
  position: absolute;
  top: -200px;
  right: -200px;
  width: 700px;
  height: 700px;
  background: radial-gradient(circle, rgba($gold, 0.07) 0%, transparent 65%);
  pointer-events: none;
}

.hero-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  width: 100%;
}

.hero-eyebrow {
  font-size: 13px;
  letter-spacing: 3px;
  color: $gold;
  margin: 0 0 16px;
  font-weight: 600;
}

.hero-text h1 {
  font-size: 52px;
  font-weight: 800;
  line-height: 1.15;
  margin: 0 0 24px;
  color: #fff;
  letter-spacing: -1px;

  @media (max-width: 768px) { font-size: 36px; }
}

.hero-desc {
  font-size: 16px;
  line-height: 1.9;
  color: $text-muted;
  margin: 0 0 36px;
}

.free-badge {
  display: inline-block;
  margin-top: 10px;
  margin-right: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  padding: 5px 12px;
  border-radius: 20px;
}

.privacy-badge {
  display: inline-block;
  margin-top: 10px;
  font-size: 13px;
  color: $gold-lt;
  background: rgba($gold, 0.1);
  border: 1px solid rgba($gold, 0.25);
  padding: 5px 12px;
  border-radius: 20px;
}

.cta-group { display: flex; gap: 12px; flex-wrap: wrap; }

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: $gold;
  color: #0a0a0f;
  border: none;
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.3px;
  transition: all 0.2s;

  text-decoration: none;

  &:hover {
    background: $gold-lt;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($gold, 0.3);
  }

  &[disabled] { opacity: 0.55; cursor: not-allowed; }

  &--lg {
    padding: 18px 40px;
    font-size: 17px;
  }
}

.store-icon { width: 22px; height: 22px; object-fit: contain; }

.hero-phone {
  position: relative;
  display: flex;
  justify-content: center;

  .phone-frame { max-width: 280px; }
}

.phone-glow {
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 200px;
  background: radial-gradient(ellipse, rgba($gold, 0.15) 0%, transparent 70%);
  pointer-events: none;
  filter: blur(20px);
}

.hero-scroll-hint {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  color: $gold-dim;
  font-size: 20px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50%       { transform: translateX(-50%) translateY(8px); }
}

// ─── FEATURE 공통 ─────────────────────────────
.feature {
  padding: 100px 40px;

  &--dark { background: $bg-card; }
}

.feature-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.feature--right .feature-inner { }
.feature--left .feature-inner { }

.feature-text h2 {
  font-size: 36px;
  font-weight: 800;
  line-height: 1.3;
  color: #fff;
  margin: 0;
  @media (max-width: 768px) { font-size: 26px; }
}

.feature-points {
  list-style: none;
  padding: 0;
  margin: 24px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li {
    font-size: 14px;
    color: $text-muted;
    display: flex;
    align-items: center;
    gap: 10px;

    &::before {
      content: '';
      display: inline-block;
      width: 18px;
      height: 1px;
      background: $gold;
      flex-shrink: 0;
    }
  }
}

.feature-phone {
  position: relative;
  display: flex;
  justify-content: center;
}

.feature-badge {
  position: absolute;
  top: -16px;
  right: calc(50% - 130px);
  background: $gold;
  color: #0a0a0f;
  font-size: 18px;
  font-weight: 900;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba($gold, 0.4);
  z-index: 2;
}

// ─── REPORT ───────────────────────────────────
.report-section {
  padding: 100px 40px;
  background: $bg-mid;
}

.report-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.report-text h2 {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
  margin: 0;
  line-height: 1.3;
  @media (max-width: 768px) { font-size: 26px; }
}

.trust-score {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: rgba($gold, 0.1);
  border: 1px solid rgba($gold, 0.3);
  border-radius: 12px;
  padding: 12px 20px;
  margin-top: 24px;
}

.trust-label {
  font-size: 13px;
  color: $gold;
  letter-spacing: 1px;
}

.trust-value {
  font-size: 28px;
  font-weight: 900;
  color: $gold-lt;
  line-height: 1;
}

.report-cta-note {
  font-size: 14px;
  color: $gold-dim;
  margin-top: 20px;
  font-style: italic;
}

.report-phone { display: flex; justify-content: center; }

// ─── PRIVACY ──────────────────────────────────
.privacy-section {
  padding: 100px 40px;
  background: $bg-deep;
  text-align: center;
  border-top: 1px solid rgba($gold, 0.1);
  border-bottom: 1px solid rgba($gold, 0.1);
}

.privacy-inner {
  max-width: 680px;
  margin: 0 auto;
}

.privacy-icon-wrap { margin-bottom: 24px; }
.privacy-big-icon { font-size: 52px; }

.privacy-section h2 {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 20px;
  line-height: 1.3;
  @media (max-width: 768px) { font-size: 26px; }
}

.privacy-section p {
  font-size: 16px;
  line-height: 1.9;
  color: $text-muted;
  strong { color: $text; }
}

.privacy-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 32px;
}

.chip {
  background: rgba($gold, 0.1);
  border: 1px solid rgba($gold, 0.25);
  color: $gold-lt;
  font-size: 13px;
  padding: 7px 16px;
  border-radius: 30px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

// ─── DUO (기록 + 로그인) ──────────────────────
.duo-section {
  padding: 100px 40px;
  background: $bg-card;
}

.duo-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
}

.duo-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  background: $bg-mid;
  border: 1px solid rgba($gold, 0.12);
  border-radius: $radius;
  padding: 40px 32px;
  transition: border-color 0.2s;

  &:hover { border-color: rgba($gold, 0.3); }
}

.duo-card-text {
  text-align: center;

  h3 {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 12px;
    line-height: 1.4;
  }

  p {
    font-size: 14px;
    color: $text-muted;
    line-height: 1.8;
    margin: 0;
  }
}

// ─── SETTINGS ─────────────────────────────────
.settings-section {
  padding: 100px 40px;
  background: $bg-deep;
}

.settings-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.settings-text h2 {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 28px;
  line-height: 1.3;
  @media (max-width: 768px) { font-size: 26px; }
}

.lang-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.lang-item {
  background: rgba($gold, 0.08);
  border: 1px solid rgba($gold, 0.2);
  color: $gold-lt;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 30px;
}

.settings-phone { display: flex; justify-content: center; }

// ─── CTA FOOTER ───────────────────────────────
.cta-footer {
  position: relative;
  padding: 120px 40px;
  background: $bg-card;
  text-align: center;
  overflow: hidden;
  border-top: 1px solid rgba($gold, 0.1);
}

.cta-footer-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse, rgba($gold, 0.07) 0%, transparent 70%);
  pointer-events: none;
}

.cta-footer-inner { position: relative; z-index: 1; }

.cta-eyebrow {
  font-size: 12px;
  letter-spacing: 4px;
  color: $gold;
  font-weight: 700;
  text-transform: uppercase;
  margin: 0 0 16px;
}

.cta-footer h2 {
  font-size: 44px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 40px;
  line-height: 1.25;
  @media (max-width: 768px) { font-size: 30px; }
}

// 타오운세 웹 운세로 보내는 푸터 링크 — 자체 줄에 가운데 정렬(기존 버튼 레이아웃 불간섭).
.taounse-footer-link {
  display: block;
  width: fit-content;
  margin: 32px auto 0;
  font-size: 15px;
  font-weight: 700;
  color: $gold-lt;
  border-bottom: 1px solid rgba($gold, 0.4);
  padding-bottom: 3px;
  transition: color 0.18s, border-color 0.18s;

  &:hover { color: $gold; border-color: $gold; }
}

.footer-legal-links {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 48px;

  a {
    color: $text-muted;
    font-size: 13px;
    text-decoration: none;
    transition: color 0.15s;
    &:hover { color: $gold-lt; }
  }

  .divider { color: rgba($gold, 0.3); font-size: 12px; }
}

.footer-copy {
  color: rgba($text-muted, 0.5);
  font-size: 12px;
  margin-top: 20px;
}

// ─── STATS BAR ────────────────────────────────
.stats-bar {
  background: $bg-card;
  border-bottom: 1px solid rgba($gold, 0.1);
  padding: 32px 40px;
}

.stats-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 40px;

  @media (max-width: 860px) { padding: 16px 24px; }
}

.stat-num {
  font-size: 36px;
  font-weight: 900;
  color: $gold-lt;
  line-height: 1;
  letter-spacing: -1px;
}

.stat-unit {
  font-size: 16px;
  font-weight: 700;
  margin-left: 2px;
}

.stat-label {
  font-size: 12px;
  color: $text-muted;
  margin-top: 6px;
  letter-spacing: 0.5px;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba($gold, 0.15);

  @media (max-width: 600px) { display: none; }
}

// ─── TECH STACK ───────────────────────────────
.tech-section {
  padding: 100px 40px;
  background: $bg-mid;
}

.tech-inner {
  max-width: 1080px;
  margin: 0 auto;
}

.tech-title {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
  text-align: center;
  margin: 0 0 56px;
  line-height: 1.3;
  @media (max-width: 768px) { font-size: 26px; }
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;

  @media (max-width: 860px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 480px) { grid-template-columns: 1fr 1fr; gap: 16px; }
}

.tech-card {
  background: $bg-card;
  border: 1px solid rgba($gold, 0.12);
  border-radius: $radius;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  transition: border-color 0.2s, transform 0.2s;

  &:hover {
    border-color: rgba($gold, 0.35);
    transform: translateY(-4px);
  }
}

.tech-icon { font-size: 32px; }

.tech-name {
  font-size: 15px;
  font-weight: 700;
  color: $gold-lt;
}

.tech-desc {
  font-size: 12px;
  color: $text-muted;
  line-height: 1.7;
}

// ─── ROADMAP ──────────────────────────────────
.roadmap-section {
  padding: 100px 40px;
  background: $bg-deep;
  border-top: 1px solid rgba($gold, 0.1);
}

.roadmap-inner {
  max-width: 1080px;
  margin: 0 auto;
}

.roadmap-title {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
  text-align: center;
  margin: 0 0 56px;
  line-height: 1.3;
  @media (max-width: 768px) { font-size: 26px; }
}

.roadmap-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;

  @media (max-width: 860px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
}

.roadmap-card {
  border-radius: $radius;
  padding: 28px 24px;
  border: 1px solid transparent;

  h4 {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    margin: 10px 0 8px;
  }

  p {
    font-size: 13px;
    color: $text-muted;
    line-height: 1.7;
    margin: 0;
  }

  &--done {
    background: rgba($gold, 0.06);
    border-color: rgba($gold, 0.2);
  }

  &--wip {
    background: rgba(96, 165, 250, 0.06);
    border-color: rgba(96, 165, 250, 0.25);
  }

  &--plan {
    background: rgba(148, 163, 184, 0.05);
    border-color: rgba(148, 163, 184, 0.15);
  }
}

.roadmap-status {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

// ─── GITHUB BTN ───────────────────────────────
.github-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.15);
  color: $text;
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 32px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.3);
  }
}

// ─── 반응형 ───────────────────────────────────
@media (max-width: 860px) {
  .hero-inner,
  .feature-inner,
  .report-inner,
  .settings-inner { grid-template-columns: 1fr; gap: 48px; }

  .feature--left .feature-inner { direction: ltr; }
  .feature--left .feature-phone { order: -1; }

  .hero { padding: 60px 24px 80px; text-align: center; }
  .hero-phone { margin-top: 8px; }
  .phone-frame { max-width: 240px !important; }

  .feature, .report-section, .privacy-section,
  .duo-section, .settings-section { padding: 72px 24px; }
  .cta-footer { padding: 80px 24px; }

  .duo-inner { grid-template-columns: 1fr; }

  .feature-badge { right: calc(50% - 110px); }

  .hero-text h1 { font-size: 38px; }
  .cta-group { justify-content: center; }

  .lang-list { justify-content: flex-start; }
}

@media (max-width: 480px) {
  .hero-text h1 { font-size: 30px; }
  .feature-text h2, .report-text h2,
  .settings-text h2, .cta-footer h2 { font-size: 24px; }
  .privacy-section h2 { font-size: 24px; }
  .cta-footer h2 { font-size: 26px; }
}
</style>
