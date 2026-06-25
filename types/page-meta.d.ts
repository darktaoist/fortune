// 페이지별 검색 노출 로케일 제한(SEO 레이어). layouts/default.vue 가 소비.
// 예: definePageMeta({ seoLocales: ['ko'] }) → 한국어만 색인, 나머지 noindex+사이트맵 제외.
declare module '#app' {
  interface PageMeta {
    seoLocales?: string[]
  }
}

export {}
