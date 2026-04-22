import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { NormalizedBill } from '@/lib/legislation/normalizeBill';

const MESSAGES = [
  { title: "🔥 You're on it.", body: 'Eyes on the Capitol. +25 Civic Power.' },
  { title: '👁️ Watchdog mode: ON.', body: 'Democracy noticed. +25 Civic Power.' },
  { title: '⚡ One more bill, one more citizen who cares.', body: '+25 Civic Power earned.' },
  { title: '🛡️ Civic Guardian.', body: "You're tracking what most people never see. +25 XP." },
  { title: '📢 The system needs more of you.', body: '+25 Civic Power added to your score.' },
];

export function TrackBillButton({ bill }: { bill: NormalizedBill }) {
  const [tracked, setTracked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChecking(false); return; }
      const { data } = await supabase
        .from('user_tracked_bills')
        .select('id')
        .eq('user_id', user.id)
        .eq('bill_id', bill.id)
        .maybeSingle();
      if (!cancelled) { setTracked(!!data); setChecking(false); }
    }
    check();
    return () => { cancelled = true; };
  }, [bill.id]);

  async function handleTrack() {
    if (loading || tracked || checking) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('track-bill', {
        body: {
          billId: bill.id,
          jurisdiction: bill.jurisdiction,
          billNumber: bill.number,
          billTitle: bill.title,
          status: bill.status,
          lastAction: bill.lastAction,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Failed');

      setTracked(true);
      setBurst(true);
      setTimeout(() => setBurst(false), 1200);

      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      const streakSuffix = data.currentStreak > 1 ? ` · 🔥 ${data.currentStreak}-day streak` : '';
      toast.success(msg.title, {
        description: `${msg.body}${streakSuffix}`,
      });
    } catch (e) {
      toast.error('Could not save bill', {
        description: e instanceof Error ? e.message : 'Try again in a moment.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-block">
      <Button
        onClick={handleTrack}
        disabled={loading || checking}
        className={
          tracked
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border border-primary text-primary bg-transparent hover:bg-primary/10'
        }
      >
        {loading || checking ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : tracked ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Eye className="h-4 w-4 mr-2" />
        )}
        {tracked ? 'Tracking this bill' : 'Track this bill'}
      </Button>

      <AnimatePresence>
        {burst &&
          Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 55 + Math.random() * 35;
            return (
              <motion.span
                key={i}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  scale: 0.4,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: 'easeOut' }}
                className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-primary pointer-events-none"
              />
            );
          })}
      </AnimatePresence>
    </div>
  );
}
