import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail, type SendTemplateEmailOptions, type SendTemplateEmailResult } from './send-email.ts'
import { TEMPLATES } from './registry.ts'

// Sends through the managed helper and keeps the app's email_send_log rows
// the old send path wrote: 'sent', 'suppressed', or 'failed'.
export async function sendAndLog(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const recipient = TEMPLATES[templateName]?.to || to
  const log = async (status: string, error_message?: string) => {
    const { error } = await db.from('email_send_log').insert({
      message_id: null,
      template_name: templateName,
      recipient_email: recipient,
      status,
      ...(error_message ? { error_message: error_message.slice(0, 1000) } : {}),
    })
    if (error) console.error('email_send_log insert failed', { code: error.code, message: error.message })
  }
  try {
    const result = await sendTemplateEmail(templateName, to, options)
    await log(result.sent ? 'sent' : 'suppressed')
    return result
  } catch (e) {
    await log('failed', e instanceof Error ? e.message : String(e))
    throw e
  }
}
