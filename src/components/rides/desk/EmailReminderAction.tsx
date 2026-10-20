import { useState } from 'react';
import { Check, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { canSendCoordinatorReminder } from '@/lib/coordinatorReminder';

export interface ReminderRide { id: string; ride_day: string; status: string; hasEmail: boolean }
export function EmailReminderAction({ ride, now = Date.now(), sent = false, onChanged }: {
  ride: ReminderRide; now?: number; sent?: boolean; onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  if (!canSendCoordinatorReminder(ride, now)) return null;
  const done = sent || result === 'sent';
  const attempted = result === 'already_attempted';
  const send = async () => {
    setBusy(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('coordinator-email-reminder', { body: { ride_id: ride.id } });
      setResult(error ? 'not_sent' : data?.status ?? 'not_sent');
      onChanged?.();
    } catch { setResult('not_sent'); } finally { setBusy(false); }
  };
  const message = result === 'address_limit' ? 'Email limit reached. Call the rider.'
    : result === 'suppressed' ? 'Email is unavailable. Call the rider.'
    : attempted ? 'Reminder already attempted. Call the rider.'
    : result && !done ? 'Reminder did not send. Call the rider.' : null;
  return <div className="space-y-2">
    <p className="text-xs text-muted-foreground">Email on file</p>
    <Button variant="outline" className="min-h-11 max-w-full" disabled={busy || done || attempted} onClick={send}>
      {done ? <Check aria-hidden="true" /> : <Mail aria-hidden="true" />}
      {done ? 'Reminder sent' : busy ? 'Sending reminder' : 'Email reminder'}
    </Button>
    <div role="status" className="text-sm text-muted-foreground">{message ?? (done ? 'Reminder sent' : '')}</div>
  </div>;
}