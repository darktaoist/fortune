/**
 * Per-page SEO helper. Call once in a page's <script setup>:
 *
 *   usePageSeo('today')                  // title = "<seo.today.title> · <suffix>"
 *   usePageSeo('home', { suffix: false }) // title = "<seo.home.title>" verbatim
 *
 * Requires i18n keys `seo.<key>.title` and `seo.<key>.desc` in all 4 locales.
 * The brand suffix (`seo.titleSuffix`) features "K-Fortune" for en/ja/zh, so
 * every non-Korean page surfaces the K-Fortune brand automatically.
 *
 * hreflang / canonical / og:locale / <html lang> come from useLocaleHead in the
 * default layout; og:site_name / twitter:card / og:type come from the global
 * default in app.vue. This composable only sets the page's title + description.
 */
export function usePageSeo(
  key: string,
  options: { suffix?: boolean } = {},
) {
  const { t } = useI18n()
  const withSuffix = options.suffix ?? true

  const title = computed(() => {
    const base = t(`seo.${key}.title`)
    return withSuffix ? `${base} · ${t('seo.titleSuffix')}` : base
  })
  const description = computed(() => t(`seo.${key}.desc`))

  useSeoMeta({
    title: () => title.value,
    description: () => description.value,
    ogTitle: () => title.value,
    ogDescription: () => description.value,
    twitterTitle: () => title.value,
    twitterDescription: () => description.value,
  })

  return { title, description }
}
