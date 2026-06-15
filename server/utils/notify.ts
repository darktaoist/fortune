// 관리자 결제 알림(텔레그램). 알림 실패는 결제 흐름을 절대 깨지 않는다 — 모든 에러를 삼키고 로그만 남긴다.
// useRuntimeConfig / $fetch 는 Nitro 서버 컨텍스트 전역 제공(import 불필요).

interface PaidNotice {
  service: string        // type_key (lifetime/celeb/mbti/newyear ...)
  orderName?: string     // 사람이 읽는 상품명
  amount: number         // 최소 단위 (KRW=원, USD=센트)
  currency: string       // 'KRW' | 'USD'
  orderNo: string
  userEmail?: string | null
  isTest: boolean        // 테스트 결제 여부
}

function fmtAmount(amount: number, currency: string): string {
  if (currency === 'USD') return `$${(amount / 100).toFixed(2)}`
  return `${amount.toLocaleString('ko-KR')}원`
}

// 텔레그램 MarkdownV2 특수문자 이스케이프 (메시지 본문이 깨지지 않도록)
function esc(s: string): string {
  return String(s).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (m) => `\\${m}`)
}

export async function notifyPaid(notice: PaidNotice): Promise<void> {
  try {
    const cfg = useRuntimeConfig()
    const token = cfg.telegramBotToken
    const chatId = cfg.telegramChatId
    if (!token || !chatId) return // 미설정 시 조용히 skip

    const tag = notice.isTest ? '🧪 *\\[테스트\\]*' : '💰 *\\[실결제\\]*'
    const lines = [
      `${tag} 결제 완료`,
      '',
      `🔮 상품\\: ${esc(notice.orderName || notice.service)}`,
      `💵 금액\\: *${esc(fmtAmount(notice.amount, notice.currency))}*`,
      notice.userEmail ? `👤 회원\\: ${esc(notice.userEmail)}` : null,
      `🧾 주문\\: \`${esc(notice.orderNo)}\``,
    ].filter(Boolean)

    await $fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      },
      timeout: 5000,
    })
  } catch (e: any) {
    console.error('[notify] telegram send failed:', e?.data ?? e?.message ?? e)
  }
}
