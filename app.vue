<script setup>
// Global default SEO — guarantees every page has a sane title/description/OG
// even if it forgets to call usePageSeo(). Pages override title/description
// via usePageSeo(); site-level og:site_name / og:type / twitter:card set here
// apply everywhere.
const { t } = useI18n()

// 표준 host(site-config). og:image 등 절대 URL 구성에 사용 — env override 와 동기화.
const siteUrl = useSiteConfig().url.replace(/\/$/, '')
// 소셜 공유 기본 카드(1200×630, public/og-default.png). 카톡·트위터 미리보기용 전역 기본값.
const ogImage = `${siteUrl}/og-default.png`

useSeoMeta({
  title: () => t('seo.default.title'),
  description: () => t('seo.default.desc'),
  ogSiteName: '타오운세',
  ogType: 'website',
  ogTitle: () => t('seo.default.title'),
  ogDescription: () => t('seo.default.desc'),
  ogImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: '타오운세 — 만세력으로 계산하는 사주·운세',
  twitterCard: 'summary_large_image',
  twitterImage: ogImage,
})

// 사이트 전역 구조화 데이터(Organization + WebSite). 검색엔진의 사이트 식별·
// 브랜드 패널 후보에 사용된다. 페이지별 JSON-LD(랜딩 FAQPage 등)와 별개로 한 번만 emit.
useHead({
  meta: [
    // 네이버 서치어드바이저(웹마스터 도구) 사이트 소유확인.
    { name: 'naver-site-verification', content: '461b984a7b37292bb136958e1ae57bee5ab6d879' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${siteUrl}/#organization`,
            name: '타오운세',
            // 구글이 "타오운세"를 "타로운세"의 오타로 자동정정하고 있다(2026-09-07 SERP 실측).
            // 고유 엔티티 신호를 늘리기 위해 표기 변형을 함께 선언한다.
            // TODO: sameAs(틱톡·유튜브·인스타·스레드·blog.taoist.co.kr 프로필 URL) 추가 —
            //       해시태그 페이지가 이미 상위에 뜨는데 사이트와 엔티티로 안 묶여 있다.
            alternateName: ['타오 운세', '타오사주', 'Tao Fortune', 'K-Fortune'],
            url: `${siteUrl}/`,
          },
          {
            '@type': 'WebSite',
            '@id': `${siteUrl}/#website`,
            name: '타오운세',
            url: `${siteUrl}/`,
            publisher: { '@id': `${siteUrl}/#organization` },
            inLanguage: ['ko', 'en', 'ja', 'zh'],
          },
        ],
      }),
    },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
