import type { Myeongsik } from './myeongsik'
import { NEWYEAR_YEAR } from '~/shared/newyear'

/**
 * 일주(日柱)별 연도 참고 해석(ilju_yearly) 조회 — 유료 신년운세·평생사주 프롬프트의 "참고 해석" 재료.
 * 테이블은 공개 읽기 정책이 없어(0017) service role 클라이언트로만 읽힌다.
 * 운영은 published만, 개발(npm run dev)은 draft도 읽는다. 같은 언어 행만 쓴다 — 다른 언어(ko)로
 * 대체하면 비-ko 결과에 한글이 섞이는 누수 경로가 되므로 없으면 null(= 기존 프롬프트 그대로).
 */
export interface IljuRef {
  year: number
  ilju: string
  nature: string
  year_relation: string
  wealth: string
  career: string
  love: string
  health: string
  caution: string
}

/** 참고 해석을 쓰는 운세 타입. */
export const ILJU_REF_TYPES = new Set(['newyear', 'lifetime'])

export async function loadIljuRef(admin: any, myeongsik: Myeongsik | null, lang: string, year: number = NEWYEAR_YEAR): Promise<IljuRef | null> {
  const day = myeongsik?.pillars?.day
  if (!day) return null
  let q = admin
    .from('ilju_yearly')
    .select('year, ilju, nature, year_relation, wealth, career, love, health, caution')
    .eq('year', year)
    .eq('ilju', `${day[0]}${day[1]}`)
    .eq('lang', lang)
  if (!import.meta.dev) q = q.eq('status', 'published')
  try {
    const { data } = await q.maybeSingle()
    return (data as IljuRef) || null
  } catch {
    return null // 참고 자료일 뿐 — 조회 실패가 생성을 막지 않는다
  }
}
