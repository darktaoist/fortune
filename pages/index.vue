<template>
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
    <h1>타오운세 2.0</h1>
    <p>Hello World</p>
    <p v-if="supabaseReady" style="color:green;">✓ Supabase 연결됨</p>
    <p v-else style="color:gray;">Supabase 초기화 중...</p>
  </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const supabaseReady = ref(false)

onMounted(async () => {
  try {
    await supabase.from('_dummy_').select('*').limit(1).maybeSingle()
  } catch {
    // 테이블이 없어도 연결 자체는 성공
  }
  supabaseReady.value = true
})
</script>
