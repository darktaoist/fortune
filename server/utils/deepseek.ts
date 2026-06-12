import type { GenerateOpts, StreamOpts } from './claude'

/**
 * DeepSeek 호출 래퍼 — claude.ts와 동일한 인터페이스(generateStructured, streamText).
 * OpenAI 호환 /chat/completions 엔드포인트를 fetch로 직접 호출(별도 SDK 불필요).
 * 모델: runtimeConfig.deepseekModel(기본 deepseek-chat, .env DEEPSEEK_MODEL로 교체).
 * - 구조화 출력: DeepSeek는 json_schema 미지원 → json_object 모드 + system에 키 목록/예시 주입.
 * - 스트리밍: SSE(data: {...}) 라인 파싱, choices[0].delta.content 누적.
 */
const ENDPOINT = 'https://api.deepseek.com/chat/completions'
// DeepSeek V4는 큰 max_tokens(22K/32K/64K)를 허용하므로 cap 없이 요청값을 그대로 전달.
// (운세 타입별 maxTokens: lifetime 22000, newyear 20000 등) — 미지정 시 기본값만 보강.
const DEFAULT_MAX = 8192

function cfg() {
  const c = useRuntimeConfig()
  const key = c.deepseekApiKey
  if (!key) {
    throw createError({ statusCode: 503, statusMessage: 'AI 미설정: DEEPSEEK_API_KEY 환경변수가 필요합니다.' })
  }
  return { key, model: c.deepseekModel || 'deepseek-chat' }
}

// json_object 모드 지시문 — 스키마의 키를 뽑아 "JSON으로만 답하라"고 명시(프롬프트에 'json' 단어 + 예시 필수).
function jsonDirective(schema: Record<string, any>): string {
  const props = (schema && schema.properties) || {}
  const keys: string[] = Array.isArray(schema?.required) && schema.required.length
    ? schema.required
    : Object.keys(props)
  const example = `{${keys.map((k) => `"${k}": "..."`).join(', ')}}`
  return [
    '',
    'You MUST respond with ONLY a single valid JSON object — no markdown, no code fences, no commentary.',
    `The JSON object must contain exactly these string keys: ${keys.join(', ')}.`,
    "Each value is a non-empty string containing that section's full content in the requested language.",
    `Example JSON shape: ${example}`,
  ].join('\n')
}

export async function deepseekGenerateStructured<T = any>(opts: GenerateOpts): Promise<T> {
  const { key, model } = cfg()

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX,
      response_format: { type: 'json_object' },
      stream: false,
      messages: [
        { role: 'system', content: opts.system + jsonDirective(opts.schema) },
        { role: 'user', content: opts.user },
      ],
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw createError({ statusCode: 502, statusMessage: `DeepSeek 오류(${res.status}): ${detail.slice(0, 300)}` })
  }

  const json: any = await res.json()
  const text: string = json?.choices?.[0]?.message?.content || ''
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

/** 텍스트 스트리밍 — 델타가 올 때마다 onText 호출, 종료 시 전체 텍스트 반환. */
export async function deepseekStreamText(opts: StreamOpts): Promise<string> {
  const { key, model } = cfg()

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX,
      stream: true,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    }),
  })
  if (!res.ok || !res.body) {
    const detail = res.body ? await res.text().catch(() => '') : ''
    throw createError({ statusCode: 502, statusMessage: `DeepSeek 오류(${res.status}): ${detail.slice(0, 300)}` })
  }

  const reader = (res.body as ReadableStream<Uint8Array>).getReader()
  const decoder = new TextDecoder()
  let sse = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    sse += decoder.decode(value, { stream: true })

    // SSE는 줄 단위 'data: {...}'. 완성된 줄만 처리하고 나머지는 버퍼에 보관.
    let nl: number
    while ((nl = sse.indexOf('\n')) >= 0) {
      const line = sse.slice(0, nl).trim()
      sse = sse.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const obj = JSON.parse(payload)
        const delta: string = obj?.choices?.[0]?.delta?.content || ''
        if (delta) {
          full += delta
          try { opts.onText(delta) } catch { /* onText 오류 무시 */ }
        }
      } catch { /* 부분 청크 — 다음 read에서 이어붙여 재시도 */ }
    }
  }
  return full
}
