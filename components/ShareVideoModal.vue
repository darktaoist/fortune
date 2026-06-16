<script setup>
import { useShortform } from '~/composables/useShortform'

const props = defineProps({ args: { type: Object, required: true } })
const open = ref(false)
const { busy, progress, resultUrl, errorMsg, generate } = useShortform()

async function start() {
  open.value = true
  await generate(props.args)
}
function download() {
  if (!resultUrl.value) return
  const a = document.createElement('a')
  a.href = resultUrl.value
  a.download = 'taoist-gunghap.mp4'
  a.click()
}
async function share() {
  if (!resultUrl.value) return
  try {
    const blob = await (await fetch(resultUrl.value)).blob()
    const file = new File([blob], 'taoist-gunghap.mp4', { type: blob.type })
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] })
    else download()
  } catch {
    download()
  }
}
</script>

<template>
  <div class="sf-wrap">
    <button class="sf-btn" :disabled="busy" @click="start">🎬 영상으로 공유</button>

    <div v-if="open" class="sf-modal" @click.self="open = false">
      <div class="sf-card">
        <div v-if="busy" class="sf-progress">
          <p>영상 만드는 중… {{ Math.round(progress * 100) }}%</p>
          <div class="sf-bar"><div :style="{ width: progress * 100 + '%' }" /></div>
        </div>

        <template v-else-if="resultUrl">
          <video :src="resultUrl" controls autoplay loop playsinline muted class="sf-video" />
          <div class="sf-actions">
            <button @click="share">공유</button>
            <button @click="download">다운로드</button>
            <button @click="open = false">닫기</button>
          </div>
        </template>

        <div v-else class="sf-error">
          <p>영상을 만들지 못했어요. {{ errorMsg }}</p>
          <button @click="open = false">닫기</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sf-wrap { display: flex; justify-content: center; margin: 24px 0; }
.sf-btn {
  background: var(--gold-primary, #c9a84c);
  color: #0a0a0f;
  border: none;
  border-radius: 12px;
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.sf-btn:disabled { opacity: 0.6; cursor: default; }
.sf-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.sf-card {
  background: #111118;
  border: 1px solid #2a2a35;
  border-radius: 16px;
  padding: 20px;
  width: min(360px, 92vw);
  color: #e8e4dc;
  text-align: center;
}
.sf-video { width: 100%; border-radius: 12px; aspect-ratio: 9 / 16; background: #000; }
.sf-bar { height: 8px; background: #2a2a35; border-radius: 4px; overflow: hidden; margin-top: 10px; }
.sf-bar > div { height: 100%; background: #c9a84c; transition: width 0.2s; }
.sf-actions { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
.sf-actions button,
.sf-error button {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #3a3a45;
  background: #1a1a22;
  color: #e8e4dc;
  cursor: pointer;
}
.sf-error { font-size: 14px; }
</style>
