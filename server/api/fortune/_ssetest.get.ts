// 임시 진단용 — premium-stream의 핵심(DeepSeek 스트리밍→SSE 중계)을 게이트 없이 재현.
// 실제 운세와 무관. ?raw=1 이면 DeepSeek fetch만(SSE 없이) 테스트.
export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig()
  const key = cfg.deepseekApiKey
  const model = cfg.deepseekModel || 'deepseek-chat'
  const sys = '너는 사주 전문가다. 신년운세를 총운/재물/직업/애정/건강 5개 섹션으로 각 [[key]] 마커 붙여 상세히 한국어로.'
  const user = '명식: 임자년 병오월 계사일 을묘시. 2026년 신년운세 매우 상세히.'

  const es = createEventStream(event)
  const send = (obj: any) => es.push(JSON.stringify(obj))
  ;(async () => {
    let sent = 0
    try {
      send({ type: 'meta', pad: 'x'.repeat(1300) })
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, max_tokens: 24000, stream: true, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }),
      })
      if (!res.ok || !res.body) { send({ type: 'error', status: res.status, body: (await res.text().catch(() => '')).slice(0, 200) }); return }
      const reader = (res.body as ReadableStream<Uint8Array>).getReader()
      const dec = new TextDecoder()
      let sse = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        sse += dec.decode(value, { stream: true })
        let nl: number
        while ((nl = sse.indexOf('\n')) >= 0) {
          const line = sse.slice(0, nl).trim(); sse = sse.slice(nl + 1)
          if (!line.startsWith('data:')) continue
          const p = line.slice(5).trim()
          if (!p || p === '[DONE]') continue
          try {
            const delta = JSON.parse(p)?.choices?.[0]?.delta?.content || ''
            if (delta) { sent += delta.length; if (sent % 500 < delta.length) send({ type: 'progress', chars: sent }) }
          } catch { /* partial */ }
        }
      }
      send({ type: 'done', chars: sent })
    } catch (e: any) {
      send({ type: 'threw', name: e?.name, msg: e?.message, cause: e?.cause?.code || e?.cause?.message })
    } finally {
      await es.close()
    }
  })()
  return es.send()
})
