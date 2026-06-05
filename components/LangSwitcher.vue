<script setup>
// Language dropdown — wired to @nuxtjs/i18n. Replaces the prototype's
// vanilla buildLangMenus()/setLang() in i18n.js. Styling comes from the
// shared .lang-dropdown / .lang-toggle / .lang-menu / .lang-option classes
// in design-system.css.
const { locale, locales, setLocale } = useI18n()

const open = ref(false)
const root = ref(null)

const current = computed(
  () => locales.value.find((l) => l.code === locale.value) || locales.value[0],
)

function choose(code) {
  setLocale(code)
  open.value = false
}

function onDocClick(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="lang-dropdown" :class="{ open }">
    <button
      class="lang-toggle"
      type="button"
      aria-haspopup="true"
      :aria-expanded="open"
      @click.stop="open = !open"
    >
      <span class="flag">{{ current.flag }}</span>
      <span class="code">{{ current.short }}</span>
    </button>
    <div class="lang-menu" role="menu">
      <button
        v-for="l in locales"
        :key="l.code"
        type="button"
        role="menuitem"
        class="lang-option"
        :class="{ active: l.code === locale }"
        @click="choose(l.code)"
      >
        <span class="flag">{{ l.flag }}</span>
        <span class="label">{{ l.name }}</span>
        <span class="code">{{ l.short }}</span>
      </button>
    </div>
  </div>
</template>
