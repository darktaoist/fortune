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

export function generateStructured<T = any>(opts: GenerateOpts, provider?: string | null): Promise<T> {
  return resolveProvider(provider) === 'claude'
    ? claudeGenerateStructured<T>(opts)
    : deepseekGenerateStructured<T>(opts)
}

export function streamText(opts: StreamOpts, provider?: string | null): Promise<string> {
  return resolveProvider(provider) === 'claude'
    ? claudeStreamText(opts)
    : deepseekStreamText(opts)
}
