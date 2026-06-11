import { serverSupabaseServiceRole } from '#supabase/server'
import { buildMyeongsik, type MyeongsikInput } from '../../utils/myeongsik'
import { computeLotto } from '../../utils/lotto'
import { fortuneNumber } from './today.post'

/**
 * 로또 운세(lotto) — 벤치마크 패리티 개편.
 *
 * 두 개의 독립 결정적 셀렉터:
 *   1) 텍스트 셀렉터 (1.0 호환): num = (Y+M+D + 주차) % 48 → lotto 테이블에서
 *      운세총론(unsetotal)/구입전략(lottolucky)/희망(wish)을 (num,nation)로 읽는다.
 *   2) 계산 셀렉터 (신규): 명식(命式)에서 게이지/주간7일/행운번호/사주궁합표/
 *      행운속성을 결정적으로 파생(server/utils/lotto.ts). 나라별 실제 복권 범위.
 *
 * 명식 row가 없거나(달력 데이터 미스) 하면 computed=null, 텍스트만 그레이스풀 반환.
 */
const NATION: Record<string, string> = { ko: 'k', en: 'e', ja: 'j', zh: 'c' }

function lottoNumber(year: number, month: number, day: number, target: string) {
  const [ty, tm, td] = target.split('-').map(Number)
  const soy = new Date(ty, 0, 1) // Jan 1, local midnight
  const dayOfYear = Math.floor((new Date(ty, tm - 1, td).getTime() - soy.getTime()) / 86400000)
  const weekNumber = Math.ceil((dayOfYear + soy.getDay() + 1) / 7)
  const userValue = year + month + day
  return String((userValue + weekNumber) % 48).padStart(3, '0')
}

const COLS = 'unsetotal, lottolucky, wish'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const year = Number(body?.year)
  const month = Number(body?.month)
  const day = Number(body?.day)
  if (!year || !month || !day) {
    throw createError({ statusCode: 400, statusMessage: 'birth date (year, month, day) required' })
  }
  const hour = body?.hour == null || body.hour === '' ? null : Number(body.hour)
  const minute = body?.minute == null || body.minute === '' ? null : Number(body.minute)
  const gender: 'm' | 'f' = body?.gender === 'f' ? 'f' : 'm'
  const calendar = ['solar', 'lunar', 'lunar-leap'].includes(body?.calendar) ? body.calendar : 'solar'
  const lang = String(body?.lang || 'ko')
  const nation = NATION[lang] || 'k'
  const target = /^\d{4}-\d{2}-\d{2}$/.test(body?.target) ? body.target : new Date().toISOString().slice(0, 10)
  const num = lottoNumber(year, month, day, target)

  const admin = serverSupabaseServiceRole(event)

  // 1) 텍스트 셀렉터 (1.0 호환 fallback 체인).
  const pick = async (n: string, nat: string) =>
    (await admin.from('lotto').select(COLS).eq('num', n).eq('nation', nat).maybeSingle()).data
  let usedNation = nation
  let text = await pick(num, nation)
  if (!text) text = await pick('001', nation)
  if (!text) { text = await pick('001', 'k'); if (text) usedNation = 'k' }

  // 2) 주간 day-phrase 풀 (bucket → 변형 여러 개). nation 우선, bucket별 없으면 'k' fallback.
  const { data: dailyRows } = await admin
    .from('lotto_daily').select('bucket, variant, phrase, nation').in('nation', [nation, 'k'])
    .order('variant', { ascending: true })
  const natPool = new Map<number, string[]>()
  const korPool = new Map<number, string[]>()
  for (const r of dailyRows || []) {
    const target = r.nation === nation ? natPool : (r.nation === 'k' ? korPool : null)
    if (!target) continue
    if (!target.has(r.bucket)) target.set(r.bucket, [])
    target.get(r.bucket)!.push(r.phrase)
  }
  // bucket별 변형 중 날짜 해시(seed)로 선택 → 같은 bucket이라도 매일 다름.
  const phraseFor = (bucket: number, seed: number) => {
    const arr = (natPool.get(bucket)?.length ? natPool.get(bucket) : korPool.get(bucket))
      || korPool.get(2) || natPool.get(2) || ['']
    return arr[(((seed % arr.length) + arr.length) % arr.length)]
  }

  // 3) 계산 셀렉터 (명식).
  const input: MyeongsikInput = { year, month, day, hour, minute, calendar, gender, name: String(body?.name || '') }
  const myeongsik = await buildMyeongsik(admin, input)
  const computed = myeongsik
    ? computeLotto(myeongsik, nation, target, { year, month, day, hour, calendar }, fortuneNumber, phraseFor)
    : null

  return {
    num,
    target,
    lang,
    nation: usedNation,
    text: text || null,
    computed,
    // 하위호환: 구 클라이언트가 fortune.unsetotal 등을 읽던 경로.
    fortune: text || null,
  }
})
