/**
 * Current saju "subject" (the person whose reading we're viewing).
 *
 * - Guest: persisted to localStorage('taoist_saju') so the value survives
 *   navigation/refresh without login.
 * - Logged-in: the durable store is Supabase `people`; selecting a person sets
 *   `current` (and it's still cached to localStorage as the active selection).
 *
 * SSR-safe: state lives in useState; localStorage is touched only on the client
 * (hydrated by plugins/saju-input.client.ts on boot).
 */
export interface SajuSubject {
  name: string
  gender: 'm' | 'f'
  calendar: 'solar' | 'lunar' | 'lunar-leap'
  year: number | null
  month: number | null
  day: number | null
  hour: number | null // 실제 시각 0~23 (1.0 parity). null = 시간 모름
  minute: number | null // 실제 분 0~59. null = 모름 (number 산식엔 미반영)
  place: string
  mbti: (string | null)[]
}

const STORAGE_KEY = 'taoist_saju'

export function useSajuInput() {
  const current = useState<SajuSubject | null>('taoist:saju', () => null)

  function save(subject: SajuSubject) {
    current.value = subject
    if (import.meta.client) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(subject)) } catch { /* quota/denied */ }
    }
  }

  function clear() {
    current.value = null
    if (import.meta.client) {
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
    }
  }

  // Load from localStorage into state (client only). Called by the boot plugin.
  function hydrate() {
    if (!import.meta.client || current.value != null) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        // Legacy values stored hour as a 지지 글자(子..亥) or '?'. The model is now
        // a clock hour (0~23); coerce anything non-numeric to null (시간 모름).
        if (typeof parsed.hour !== 'number') parsed.hour = null
        if (typeof parsed.minute !== 'number') parsed.minute = null
        current.value = parsed
      }
    } catch { /* corrupt */ }
  }

  const hasInput = computed(() => !!(current.value && current.value.year && current.value.month && current.value.day))

  return { current, hasInput, save, clear, hydrate }
}
