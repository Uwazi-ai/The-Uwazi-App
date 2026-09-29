// Sends the security incident notice to its fixed recipient. Admins only.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendAndLog } from '../_shared/transactional-email-templates/send-and-log.ts'

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : undefined)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: u } = await db.auth.getUser(token)
  if (!u?.user) return json({ error: 'Please sign in.' }, 401)
  const { data: ok } = await db.rpc('is_admin', { _user_id: u.user.id })
  if (!ok) return json({ error: 'Only admins can send this.' }, 403)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const action = ['logged', 'contained', 'resolved'].includes(body.action as string) ? body.action : 'logged'
  const templateData = {
    action,
    title: str(body.title, 300),
    severity: str(body.severity, 50),
    status: str(body.status, 50),
    description: str(body.description),
    detectedAt: str(body.detectedAt, 50),
    resolvedAt: str(body.resolvedAt, 50),
    actor: u.user.email,
  }
  try {
    const r = await sendAndLog('security-incident', '', {
      templateData,
      idempotencyKey: `security-incident-${crypto.randomUUID()}`,
    })
    return json({ success: r.sent })
  } catch (e) {
    console.error('security incident email failed', (e as Error).message)
    return json({ error: 'Send failed' }, 500)
  }
})
