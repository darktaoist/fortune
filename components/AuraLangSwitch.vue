<script setup>
// AURA 페이지 전용 언어 컨트롤. 5개 aura 페이지는 layout:false(사이트 헤더·LangSwitcher 없음)라
// 이 컴포넌트 하나가 두 가지를 책임진다:
//   1) 우상단 고정 코너 스위처(KO/EN/JP/ZH) — 수동 선택만
//   2) hreflang/canonical 주입(useLocaleHead) — 랜딩 색인용
const { locale, locales, setLocale } = useI18n()
const switchLocalePath = useSwitchLocalePath()

// layout:false라 빠진 hreflang/canonical/og:locale 을 이 컴포넌트가 주입한다.
const head = useLocaleHead({ dir: true, lang: true, seo: true })
useHead(() => ({
  htmlAttrs: head.value.htmlAttrs || {},
  link: head.value.link || [],
  meta: head.value.meta || [],
}))

// 전역 i18n과 동일한 쿠키 키를 공유한다(수동 선택을 기억).
const langCookie = useCookie('taoist_lang', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

const current = computed(
  () => locales.value.find((l) => l.code === locale.value) || locales.value[0],
)

async function choose(code) {
  if (code === locale.value) return
  langCookie.value = code
  const path = switchLocalePath(code)
  if (path) await navigateTo(path)
}

// 브라우저 언어 자동 리디렉션은 두지 않는다(2026-09-07 제거).
// 전역 detectBrowserLanguage 를 끈 것과 같은 이유 — 구글봇/Yeti 는 en-US 로 렌더링하므로
// 자동감지가 있으면 크롤러가 /aura 대신 /en/aura 를 받고, ko 사이트맵에 든 aura 5개
// 페이지가 한국어로 색인되지 않는다. 언어 선택은 위 스위처(수동)로만 한다.
// 앱 웹뷰에서 기기 언어로 열어야 하면 앱이 prefix URL(/en/aura/privacy)을 직접 연다.
</script>

<template>
  <div class="aura-lang">
    <button
      v-for="l in locales"
      :key="l.code"
      type="button"
      class="aura-lang-btn"
      :class="{ active: l.code === locale }"
      :aria-label="l.name"
      :aria-current="l.code === locale ? 'true' : undefined"
      @click="choose(l.code)"
    >
      {{ l.short }}
    </button>
  </div>
</template>

<style scoped>
.aura-lang {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(10, 10, 15, 0.72);
  border: 1px solid rgba(201, 168, 76, 0.35);
  backdrop-filter: blur(8px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}
.aura-lang-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: #8a8070;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
}
.aura-lang-btn:hover {
  color: #e8c97e;
}
.aura-lang-btn.active {
  color: #0a0a0f;
  background: #c9a84c;
}
@media (max-width: 600px) {
  .aura-lang {
    top: 10px;
    right: 10px;
    padding: 3px;
  }
  .aura-lang-btn {
    padding: 5px 8px;
    font-size: 11px;
  }
}
</style>
