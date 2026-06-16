// 숏폼 프레임 프리뷰(dev 전용). node-canvas로 drawFrame을 PNG로 렌더해 육안 확인.
// 실행: npx tsx scripts/sf-preview.ts
import { createCanvas, loadImage, ImageData as NapiImageData } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync } from 'node:fs'
// illustrate 가 전역 ImageData 를 쓰므로 주입
;(globalThis as any).ImageData = NapiImageData

const { drawFrame } = await import('../utils/shortform/renderer.ts')
const { illustrate } = await import('../utils/shortform/illustrate.ts')
const { buildStoryboard } = await import('../utils/shortform/storyboard.ts')
const { DEFAULT_OPTS } = await import('../utils/shortform/types.ts')

const o = DEFAULT_OPTS
mkdirSync('/tmp/sf', { recursive: true })

// 실데이터와 유사: 긴 한국어 문장(잘림/줄바꿈 테스트), 점수 null(정국 케이스)
const sb = buildStoryboard({
  selfName: '정송엽',
  partnerName: '정국',
  partnerImageUrl: null,
  score: null,
  zodiacGlyph: '緣',
  sections: [
    { key: 'summary', title: '총평', body: '정송엽님은 계수(癸水) 일간으로 사주 전체에 수의 기운이 강한 신강한 명식입니다. 두 사람은 서로를 보완하는 깊은 인연입니다.' },
    { key: 'love', title: '연애운', body: '표현 방식이 잘 맞아 다툼이 적고 신뢰가 깊어집니다. 함께 있을 때 안정감을 느낍니다.' },
    { key: 'caution', title: '주의', body: '정국님의 뜨겁고 활발한 화 기운이 때로 부딪힐 수 있으니 호흡을 가다듬으세요.' },
  ],
})

// 일러스트 처리된 사진 준비
const src = await loadImage('public/celebs/iu.jpg')
const pc = createCanvas(900, 1125)
const pctx = pc.getContext('2d')
const r = Math.max(900 / src.width, 1125 / src.height)
pctx.drawImage(src, (900 - src.width * r) / 2, (1125 - src.height * r) / 2, src.width * r, src.height * r)
const id = pctx.getImageData(0, 0, 900, 1125)
const ill = illustrate(id as any)
pctx.putImageData(ill as any, 0, 0)

const canvas = createCanvas(o.width, o.height)
const ctx = canvas.getContext('2d') as any

const times = [2, 6, 13, 19, 26]
for (const t of times) {
  drawFrame(ctx, sb, pc as any, { illustrated: null, qrBitmap: null, logoBitmap: null }, t, o)
  writeFileSync(`/tmp/sf/frame_${t}s.png`, canvas.toBuffer('image/png'))
}
console.log('rendered:', times.map((t) => `/tmp/sf/frame_${t}s.png`).join(' '))
