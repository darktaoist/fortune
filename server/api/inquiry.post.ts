import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * 문의하기 제출 — inserts into customer_inquiries via the service role (the table
 * is RLS-locked with no public policies, since it holds PII). Validates server-
 * side and returns a human-readable reference number tied to the saved row.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = String(body?.name || '').trim()
  const email = String(body?.email || '').trim()
  const type = String(body?.type || '').trim()
  const subject = String(body?.subject || '').trim()
  const content = String(body?.message ?? body?.content ?? '').trim()

  if (!name || !email || !EMAIL_RE.test(email) || !type || !subject || !content) {
    throw createError({ statusCode: 400, statusMessage: 'invalid inquiry' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('customer_inquiries')
    .insert({
      name: name.slice(0, 100),
      email: email.slice(0, 255),
      type: type.slice(0, 30),
      subject: subject.slice(0, 255),
      content: content.slice(0, 2000),
    })
    .select('id, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const d = new Date(data.created_at)
  const p = (n: number) => String(n).padStart(2, '0')
  const ref = `TAO-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${String(data.id).padStart(4, '0')}`

  return { ok: true, ref }
})
