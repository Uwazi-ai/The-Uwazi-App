import { useState } from 'react';
import { Mail, Send, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import type { Settings } from './deskLib';
import { ZtripDispatchSettings } from './ZtripDispatchSettings';
export function EmailAlerts({ settings, onSettings }: { settings: Settings; onSettings: (s: Settings) => void }) {
  const [email, setEmail] = useState(settings.notify_emails.join(', '));
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const save = async (patch: Partial<Settings>) => {
    setBusy(true); setMessage('');
    const { data, error } = await supabase.from('ride_settings').update(patch).eq('id', true).select('*').single();
    if (data && !error) { onSettings(data); setMessage('Email settings saved.'); } else setMessage('Settings were not saved. Enter one valid email address.');
    setBusy(false);
  };
  return <section aria-labelledby="ride-email-heading" className="mt-6 border-y border-border py-6">
    <h2 id="ride-email-heading" className="flex items-center gap-2 font-heading text-xl"><Mail className="h-5 w-5 text-primary" />Email alerts</h2>
    <div className="mt-4 max-w-xl space-y-4">
      <Label htmlFor="ride-alert-recipient">Coordinator email</Label>
      <div className="flex flex-col gap-2 sm:flex-row"><Input id="ride-alert-recipient" type="email" value={email} onChange={e => setEmail(e.target.value)} className="min-h-11" /><Button variant="outline" disabled={busy} onClick={() => save({ notify_emails: [email.trim()] })}><Save className="mr-2 h-4 w-4" />Save</Button></div>
      <p className="text-sm text-muted-foreground">One recipient. Up to 30 alerts per hour.</p>
      {([['notify_new_requests', 'New website requests'], ['notify_waitlist', 'Waitlist signups'], ['notify_include_contact', 'Include first name, last initial and phone']] as const).map(([key, label]) => <div key={key} className="flex min-h-11 items-center justify-between gap-4"><Label htmlFor={key}>{label}</Label><Switch id={key} checked={settings[key]} disabled={busy} onCheckedChange={value => save({ [key]: value })} /></div>)}
      <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); setMessage('Sending test email.'); try { const { data, error } = await supabase.functions.invoke('ride-request-alert', { body: { action: 'test' } }); setMessage(error ? 'Test email was not sent.' : `Test email ${data.status}. ${data.messageId ? `ID: ${data.messageId}` : ''}`); } catch { setMessage('Test email was not sent.'); } finally { setBusy(false); } }}><Send className="mr-2 h-4 w-4" />Send test email</Button>
      <p role="status" className="break-words text-sm">{message}</p>
    </div>
    <ZtripDispatchSettings settings={settings} onSettings={onSettings} />
  </section>;
}