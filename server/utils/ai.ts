import type { GenerateOpts, StreamOpts } from './claude'
import { claudeGenerateStructured, claudeStreamText } from './claude'
import { deepseekGenerateStructured, deepseekStreamText } from './deepseek'

/**
 * AI 프로바이더 디스패처 — Claude(Anthropic)와 DeepSeek를 같은 인터페이스로 추상화.
 * 기본 프로바이더: runtimeConfig.aiProvider(.env AI_PROVIDER, 기본 'deepseek').
 * 요청별로 provider 인자를 넘기면 그 호출만 특정 엔진으로 강제할 수 있다.
 * ⚠️ 캐시 키 분리: 프리미엄 라우트는 activeModelId()를 캐시 시그니처에 포함해
 *    Claude/DeepSeek 결과가 같은 hash로 섞이지 않게 한다.
 */
export type AiProvider = 'deepseek' | 'claude'

export function resolveProvider(override?: string | null): AiProvider {
  const o = String(override || '').toLowerCase()
  if (o === 'claude' || o === 'anthropic') return 'claude'
  if (o === 'deepseek') return 'deepseek'
  const def = String(useRuntimeConfig().aiProvider || 'deepseek').toLowerCase()
  return def === 'claude' || def === 'anthropic' ? 'claude' : 'deepseek'
}

/** 캐시 키에 넣을 모델 식별자(프로바이더 전환 시 캐시 충돌 방지). */
export function activeModelId(provider?: AiProvider): string {
  const p = provider || resolveProvider()
  const c = useRuntimeConfig()
  return p === 'claude'
    ? `claude:${c.premiumModel}`
    : `deepseek:${c.deepseekModel || 'deepseek-chat'}`
}

/** 해당 프로바이더의 API 키가 설정돼 있는지. 폴백 후보 판정에 사용. */
function hasKey(p: AiProvider): boolean {
  const c = useRuntimeConfig()
  return p === 'claude' ? !!c.anthropicApiKey : !!c.deepseekApiKey
}

/** 시도 순서: 1차(요청/기본) → 다른 프로바이더. 키가 있는 것만 남긴다. */
function providerChain(primary: AiProvider): AiProvider[] {
  const other: AiProvider = primary === 'claude' ? 'deepseek' : 'claude'
  return [primary, other].filter(hasKey)
}

const NO_PROVIDER = () => createError({ statusCode: 503, statusMessage: 'AI 미설정: 사용 가능한 AI 제공자가 없습니다(키 확인).' })

/**
 * 구조화 생성 — 1차 프로바이더 실패 시 다른 프로바이더로 자동 폴백.
 * (예: DeepSeek 모델명 오류/장애 → Claude로 전환). 모두 실패하면 마지막 에러를 던진다.
 */
export async function generateStructured<T = any>(opts: GenerateOpts, provider?: string | null): Promise<T> {
  const chain = providerChain(resolveProvider(provider))
  if (!chain.length) throw NO_PROVIDER()
  let lastErr: any
  for (const p of chain) {
    try {
      return await (p === 'claude' ? claudeGenerateStructured<T>(opts) : deepseekGenerateStructured<T>(opts))
    } catch (e) {
      lastErr = e
      console.warn(`[ai] generateStructured via ${p} failed, trying next:`, (e as any)?.statusMessage || (e as any)?.message)
    }
  }
  throw lastErr
}

/**
 * 텍스트 스트리밍 — 1차 실패 시 폴백. 단 이미 토큰을 일부라도 내보냈으면(중복 방지)
 * 폴백하지 않고 그대로 에러를 던진다(연결/인증 단계 실패만 폴백 대상).
 */
export async function streamText(opts: StreamOpts, provider?: string | null): Promise<string> {
  const chain = providerChain(resolveProvider(provider))
  if (!chain.length) throw NO_PROVIDER()
  let lastErr: any
  for (const p of chain) {
    let emitted = 0
    const wrapped: StreamOpts = { ...opts, onText: (d) => { emitted += d.length; opts.onText(d) } }
    try {
      return await (p === 'claude' ? claudeStreamText(wrapped) : deepseekStreamText(wrapped))
    } catch (e) {
      lastErr = e
      console.warn(`[ai] streamText via ${p} failed${emitted ? ' (after partial output, no fallback)' : ', trying next'}:`, (e as any)?.statusMessage || (e as any)?.message)
      if (emitted > 0) throw e // 일부라도 출력했으면 폴백 시 중복 → 중단
    }
  }
  throw lastErr
}
