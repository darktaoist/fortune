// Hydrate the saju subject from localStorage once on client boot, so guest
// input persists across navigation/refresh.
export default defineNuxtPlugin(() => {
  useSajuInput().hydrate()
})
