import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import type { NormalizedBill } from '@/lib/legislation/normalizeBill';

export function CommunityImpactCard({ bill }: { bill: NormalizedBill }) {
  const [text, setText] = useState<string | null>(null);
  const [city, setCity] = useState('Your Community');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let zip = '', cityName = '', stateName = '';
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('zip_code, city, state_code')
            .eq('user_id', user.id)
            .maybeSingle();
          zip = profile?.zip_code ?? '';
          cityName = profile?.city ?? '';
          stateName = profile?.state_code ?? '';
        }

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

        const filled = String(data.community_impact_template)
          .replaceAll('{zip}', zip || 'your zip code')
          .replaceAll('{city}', cityName || 'your city')
          .replaceAll('{state}', stateName || 'your state');

        if (!cancelled) {
          setCity(cityName || 'Your Community');
          setText(filled);
        }
      } catch {
        if (!cancelled) setText(null);
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
          <MapPin className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            What This Means for {city}
          </span>
        </div>
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-8/12" />
          </div>
        )}
        {!loading && !text && (
          <p className="text-sm text-muted-foreground">
            Add your zip code in Settings → Profile to see personalized community impact.
          </p>
        )}
        {text && (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{text}</p>
        )}
      </Card>
    </motion.div>
  );
}
