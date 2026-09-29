import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

type Reason = 'bounce' | 'complaint' | 'unsubscribe'
const STATUS: Record<Reason, string> = { bounce: 'bounced', complaint: 'complained', unsubscribe: 'suppressed' }
const MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

// Notification-only copy of outcomes. Lovable enforces suppression at send time.
async function record(eventId: string, recipient: string, reason: Reason, messageId?: string | null) {
  const email = recipient.toLowerCase()
  const { error: sErr } = await db
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })
  if (sErr) {
    console.error('suppressed_emails upsert failed', { event_id: eventId, code: sErr.code, message: sErr.message })
    throw new Error('suppressed_emails upsert failed')
  }
  const { error: lErr } = await db.from('email_send_log').insert({
    message_id: messageId ?? null,
    template_name: 'system',
    recipient_email: email,
    status: STATUS[reason],
    error_message: MESSAGE[reason],
    metadata: null,
  })
  if (lErr) {
    console.error('email_send_log insert failed', { event_id: eventId, code: lErr.code, message: lErr.message })
    throw new Error('email_send_log insert failed')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await record(event.event_id, event.data.recipient, 'bounce', event.data.message_id)
    },
    'email.complaint': async (event) => {
      await record(event.event_id, event.data.recipient, 'complaint', event.data.message_id)
    },
    'email.unsubscribed': async (event) => {
      await record(event.event_id, event.data.recipient, 'unsubscribe', event.data.message_id)
    },
  },
})

Deno.serve((req) => handler(req))
