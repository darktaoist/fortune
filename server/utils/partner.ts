import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'
import type { MyeongsikInput } from './myeongsik'

/** 궁합 상대 참조 — 프론트는 식별자만 넘기고 생년월일은 서버가 DB에서 조회. */
export interface PartnerRef { id?: string; kind?: string; name?: string }

// 생시 파싱 → {hour, minute}. 비어있으면(미지생시) hour:null.
// people.birth_time은 "HH:MM:SS"(콜론), celebrities.birth_time은 "HHMM"(예 "1200","0900") 형식이라 둘 다 처리.
function parseTime(t: string | null | undefined): { hour: number | null; minute: number | null } {
  if (!t) return { hour: null, minute: null }
  const s = String(t).trim()
  if (!s) return { hour: null, minute: null }
  if (s.includes(':')) {
    const [h, m] = s.split(':').map((x) => parseInt(x, 10))
    return { hour: Number.isFinite(h) ? h : null, minute: Number.isFinite(m) ? m : 0 }
  }
  const digits = s.replace(/\D/g, '')
  if (!digits) return { hour: null, minute: null }
  const p = digits.padStart(4, '0')
  const h = parseInt(p.slice(0, 2), 10)
  const m = parseInt(p.slice(2, 4), 10)
  return { hour: Number.isFinite(h) ? h : null, minute: Number.isFinite(m) ? m : 0 }
}

// 'lunar_leap'(celebrities DB)·'lunar-leap' 모두 하이픈으로 통일. buildMyeongsik은 하이픈을 기대한다.
function normCalendar(c: string | null | undefined): string {
  const v = String(c || 'solar').replace('_', '-')
  return v === 'lunar-leap' || v === 'lunar' ? v : 'solar'
}

function normGender(g: string | null | undefined): 'm' | 'f' {
  return String(g || '').toLowerCase() === 'f' ? 'f' : 'm'
}

/**
 * 궁합 상대({id,kind})를 MyeongsikInput으로 해석.
 *  - kind 'celeb'  : celebrities(slug)에서 조회(공개 데이터)
 *  - kind 'friend' : people(uuid)에서 조회하되 owner_id=본인으로 강제(타인 사주 열람 차단)
 * 못 찾으면 null.
 */
export async function resolvePartnerInput(
  admin: any,
  event: H3Event,
  partner: PartnerRef | null | undefined,
): Promise<MyeongsikInput | null> {
  if (!partner?.id) return null
  const kind = partner.kind === 'friend' ? 'friend' : 'celeb'

  if (kind === 'celeb') {
    const { data: c } = await admin
      .from('celebrities')
      .select('birth_year, birth_month, birth_day, birth_time, gender, calendar_type')
      .eq('slug', partner.id)
      .maybeSingle()
    if (!c) return null
    const { hour, minute } = parseTime(c.birth_time)
    return {
      year: c.birth_year, month: c.birth_month, day: c.birth_day,
      hour, minute,
      calendar: normCalendar(c.calendar_type),
      gender: normGender(c.gender),
      name: partner.name || '',
    }
  }

  // friend: serverSupabaseUser는 비로그인 시 throw → catch로 null 처리(mypage gotcha와 동일).
  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user) return null
  const { data: p } = await admin
    .from('people')
    .select('name, gender, calendar, birth_date, birth_time')
    .eq('id', partner.id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!p || !p.birth_date) return null
  const [y, mo, d] = String(p.birth_date).split('-').map((x: string) => parseInt(x, 10))
  const { hour, minute } = parseTime(p.birth_time)
  return {
    year: y, month: mo, day: d,
    hour, minute,
    calendar: normCalendar(p.calendar),
    gender: normGender(p.gender),
    name: partner.name || p.name || '',
  }
}

/**
 * MBTI 궁합용 — 상대의 MBTI 유형만 조회(사주 불필요).
 * body.partner.mbti(직접입력)가 있으면 그것을 우선 쓰고, 없으면 id로 DB 조회.
 */
export async function resolvePartnerMbti(
  admin: any,
  event: H3Event,
  partner: (PartnerRef & { mbti?: string }) | null | undefined,
): Promise<string | null> {
  const direct = String(partner?.mbti || '').toUpperCase().trim()
  if (direct) return direct
  if (!partner?.id) return null
  const kind = partner.kind === 'friend' ? 'friend' : 'celeb'

  if (kind === 'celeb') {
    const { data: c } = await admin.from('celebrities').select('mbti').eq('slug', partner.id).maybeSingle()
    return (c?.mbti || '').toUpperCase() || null
  }
  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user) return null
  const { data: p } = await admin.from('people').select('mbti').eq('id', partner.id).eq('owner_id', user.id).maybeSingle()
  return (p?.mbti || '').toUpperCase() || null
}
