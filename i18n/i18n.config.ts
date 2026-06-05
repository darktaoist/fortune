import ko from './locales/ko.json'
import en from './locales/en.json'
import ja from './locales/ja.json'
import zh from './locales/zh.json'

/**
 * vue-i18n runtime config for @nuxtjs/i18n.
 *
 * The dictionary was ported verbatim from the design prototype's `i18n.js`.
 * Two properties of that data force us to override vue-i18n's defaults:
 *
 *  1. FLAT, dotted keys with leaf/parent collisions — e.g. both
 *     "result.overall" and "result.overall.sub" exist. vue-i18n's default
 *     resolver splits keys on "." and would break on the collision, so we
 *     install a literal flat-key `messageResolver`.
 *
 *  2. Plain prose values containing characters that vue-i18n's message
 *     compiler treats as syntax — "@" (email addresses), "|" (plural
 *     separator), ":" (linked modifiers). These are NOT i18n syntax here,
 *     just text. So we replace the compiler with a minimal one that performs
 *     only `{name}` style named/list interpolation and treats everything else
 *     as a literal — no linked messages, no pluralization, no HTML parsing.
 */

// Minimal message compiler: literal text + `{var}` interpolation only.
function compileLiteral(message: unknown) {
  if (typeof message !== 'string') {
    const v = message
    return () => v as never
  }
  // Pre-split is unnecessary; runtime replace is cheap and cached by vue-i18n.
  return ((ctx: { named: (k: string) => unknown; list: (i: number) => unknown }) =>
    message.replace(/{(\w+)}/g, (whole, key) => {
      const val = /^\d+$/.test(key) ? ctx.list(Number(key)) : ctx.named(key)
      return val === undefined || val === null ? whole : String(val)
    })) as never
}

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'ko',
  warnHtmlMessage: false,
  // Literal flat-key lookup: never split keys on '.'
  messageResolver: (obj: Record<string, unknown>, key: string) =>
    (obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null) as never,
  // Treat values as literals with `{var}` interpolation (no @/|/: syntax).
  messageCompiler: compileLiteral as never,
  messages: { ko, en, ja, zh },
}))
