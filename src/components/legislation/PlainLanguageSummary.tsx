import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import type { NormalizedBill } from '@/lib/legislation/normalizeBill';

export function PlainLanguageSummary({ bill }: { bill: NormalizedBill }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('bill-summary', {
          body: {
            billId: bill.id,
            jurisdiction: bill.jurisdiction,
            number: bill.number,
            title: bill.title,
            fullText: bill.fullText,
          },
        });
        if (fnErr) throw fnErr;
        if (!data?.ok) throw new Error(data?.error);
        if (!cancelled) setSummary(data.plain_summary);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [bill.id]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-card border-border p-5 space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Plain Language Summary · Powered by Uwazi AI
          </span>
        </div>
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-9/12" />
          </div>
        )}
        {error && (
          <p className="text-sm text-muted-foreground">
            We couldn't generate a summary right now. Check back shortly.
          </p>
        )}
        {summary && (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {summary}
          </p>
        )}
      </Card>
    </motion.div>
  );
}
