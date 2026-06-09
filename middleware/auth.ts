/**
 * 로그인 필수 라우트 가드. 보호하려는 페이지에서:
 *   definePageMeta({ middleware: 'auth' })
 * 미로그인 시 /login?redirect=<원래경로>&reason=save 로 보낸다.
 * (예정 페이지: /mypage, /library, /checkout)
 */
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  if (user.value) return
  const localePath = useLocalePath()
  return navigateTo(localePath({ path: '/login', query: { redirect: to.path, reason: 'save' } }))
})
