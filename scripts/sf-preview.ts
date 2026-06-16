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
  zodiacGlyph: '緣',
  sections: [
    { key: 'score', glyph: '緣', title: '궁합 총평', body: '두 사람의 궁합 지수: 87점. 서로를 깊이 보완하는 운명적인 인연입니다.' },
    { key: 'attraction', glyph: '心', title: '끌림', body: '첫 만남부터 강렬한 끌림이 흐릅니다. 서로의 부족한 오행을 본능적으로 채워줍니다.' },
    { key: 'personality', glyph: '性', title: '성격 궁합', body: '한 사람은 신중하고 한 사람은 활발해 일상에서 균형이 잘 잡힙니다.' },
    { key: 'lovestyle', glyph: '戀', title: '연애 스타일', body: '표현 방식이 잘 맞아 다툼이 적고 신뢰가 깊어집니다.' },
    { key: 'conflict', glyph: '和', title: '갈등', body: '정국님의 뜨거운 화 기운이 때로 부딪힐 수 있으니 호흡을 가다듬으세요.' },
    { key: 'future', glyph: '婚', title: '미래', body: '장기적으로 안정적인 관계로 발전할 가능성이 높습니다.' },
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

const times = [2, 7, 9.3, 12, 17, 27]
for (const t of times) {
  drawFrame(ctx, sb, pc as any, { illustrated: null, qrBitmap: null, logoBitmap: null }, t, o)
  writeFileSync(`/tmp/sf/frame_${t}s.png`, canvas.toBuffer('image/png'))
}
console.log('rendered:', times.map((t) => `/tmp/sf/frame_${t}s.png`).join(' '))
