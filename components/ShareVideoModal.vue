<script setup>
import { useShortform } from '~/composables/useShortform'

const { t } = useI18n()
const props = defineProps({ args: { type: Object, required: true } })
const open = ref(false)
const { busy, progress, resultBlob, resultUrl, errorMsg, stage, generate } = useShortform()

// 안드로이드 폴백은 webm으로 떨어지므로 blob 타입에 맞춰 확장자 결정.
const fileName = computed(() => {
  const t = resultBlob.value?.type || ''
  const ext = t.includes('webm') ? 'webm' : t.includes('png') ? 'png' : 'mp4'
  return `taoist-gunghap.${ext}`
})

async function start() {
  open.value = true
  await generate(props.args)
}
function download() {
  if (!resultUrl.value) return
  const a = document.createElement('a')
  a.href = resultUrl.value
  a.download = fileName.value
  a.click()
}
async function share() {
  if (!resultUrl.value) return
  try {
    const blob = resultBlob.value || (await (await fetch(resultUrl.value)).blob())
    const file = new File([blob], fileName.value, { type: blob.type })
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] })
    else download()
  } catch {
    download()
  }
}
</script>

<template>
  <div class="sf-wrap">
    <button class="sf-btn" :disabled="busy" @click="start">🎬 {{ t('sfvideo.cta') }}</button>
    <p class="sf-desc">{{ t('sfvideo.desc') }}</p>

    <div v-if="open" class="sf-modal" @click.self="open = false">
      <div class="sf-card">
        <div v-if="busy" class="sf-progress">
          <p>{{ t('sfvideo.making') }} {{ Math.round(progress * 100) }}%</p>
        <p class="sf-stage">{{ stage }}</p>
          <div class="sf-bar"><div :style="{ width: progress * 100 + '%' }" /></div>
        </div>

        <template v-else-if="resultUrl">
          <video :src="resultUrl" controls autoplay loop playsinline muted class="sf-video" />
          <div class="sf-actions">
            <button @click="share">{{ t('sfvideo.share') }}</button>
            <button @click="download">{{ t('sfvideo.download') }}</button>
            <button @click="open = false">{{ t('sfvideo.close') }}</button>
          </div>
        </template>

        <div v-else class="sf-error">
          <p>{{ t('sfvideo.error') }} {{ errorMsg }}</p>
          <button @click="open = false">{{ t('sfvideo.close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sf-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 24px 0; }
.sf-desc { font-size: 13px; color: var(--text-muted, #8a8070); margin: 0; text-align: center; }
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
.sf-stage { font-size: 12px; color: var(--text-muted, #8a8070); margin: 4px 0 0; text-align: center; }
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
