import Anthropic from '@anthropic-ai/sdk'

/**
 * Claude(Anthropic) 호출 래퍼 — 프리미엄 운세 생성용.
 * - 모델: runtimeConfig.premiumModel (기본 claude-sonnet-4-6, 환경변수로 교체).
 * - 구조화 출력: output_config.format(json_schema)로 섹션 JSON을 강제 → 파싱 보장.
 * - 프롬프트 캐싱: 큰 system(페르소나+형식 지시)에 cache_control 부여 → 반복 호출 비용 절감.
 * - 콘텐츠 생성이므로 thinking 끄고 effort low (비용/속도 우선).
 */
let _client: Anthropic | null = null
function getClient(): Anthropic {
  const key = useRuntimeConfig().anthropicApiKey
  if (!key) {
    throw createError({ statusCode: 503, statusMessage: 'AI 미설정: ANTHROPIC_API_KEY 환경변수가 필요합니다.' })
  }
  if (!_client) _client = new Anthropic({ apiKey: key })
  return _client
}

export interface GenerateOpts {
  system: string
  user: string
  schema: Record<string, any>
  maxTokens?: number
}

export async function generateStructured<T = any>(opts: GenerateOpts): Promise<T> {
  const cfg = useRuntimeConfig()
  const client = getClient()

  const res = await client.messages.create({
    model: cfg.premiumModel,
    max_tokens: opts.maxTokens ?? 12000,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: opts.schema } },
    system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: opts.user }],
  } as any)

  const block = (res.content || []).find((b: any) => b.type === 'text') as any
  const text: string = block && block.text ? block.text : ''
  if (!text) throw createError({ statusCode: 502, statusMessage: 'AI 빈 응답' })

  try {
    return JSON.parse(text) as T
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      try { return JSON.parse(m[0]) as T } catch { /* fallthrough */ }
    }
    throw createError({ statusCode: 502, statusMessage: 'AI 응답 파싱 실패' })
  }
}

export interface StreamOpts {
  system: string
  user: string
  maxTokens?: number
  onText: (delta: string) => void
}

/** 텍스트 스트리밍 — 델타가 올 때마다 onText 호출, 종료 시 전체 텍스트 반환. */
export async function streamText(opts: StreamOpts): Promise<string> {
  const cfg = useRuntimeConfig()
  const client = getClient()

  const stream = client.messages.stream({
    model: cfg.premiumModel,
    max_tokens: opts.maxTokens ?? 12000,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low' },
    system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: opts.user }],
  } as any)

  stream.on('text', (delta: string) => {
    try { opts.onText(delta) } catch { /* 소비자 오류는 스트림을 깨지 않음 */ }
  })
  const final = await stream.finalMessage()
  const block = (final.content || []).find((b: any) => b.type === 'text') as any
  return block && block.text ? block.text : ''
}
