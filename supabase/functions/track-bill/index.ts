import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { billId, jurisdiction, billNumber, billTitle, status, lastAction } = await req.json();

    const { error: insertErr } = await supabase.from('user_tracked_bills').insert({
      user_id: user.id,
      bill_id: String(billId),
      jurisdiction: jurisdiction ?? 'federal',
      bill_number: billNumber,
      bill_title: billTitle,
      status,
      last_action: lastAction,
    });

    if (insertErr?.message?.toLowerCase().includes('duplicate')) {
      return new Response(
        JSON.stringify({ ok: true, alreadyTracked: true, xpAwarded: 0 }),
        { headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }
    if (insertErr) throw insertErr;

    const { data: stats } = await supabase
      .from('user_civic_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const now = new Date();
    const lastAt = stats?.last_action_at ? new Date(stats.last_action_at) : null;
    const daysSince = lastAt
      ? Math.floor((now.getTime() - lastAt.getTime()) / 86_400_000)
      : null;

    let streak = stats?.current_streak ?? 0;
    if (daysSince === null) streak = 1;
    else if (daysSince === 0) streak = stats!.current_streak;
    else if (daysSince === 1) streak += 1;
    else streak = 1;

    const newXp = (stats?.civic_xp ?? 0) + 25;
    const newCount = (stats?.bills_tracked_count ?? 0) + 1;

    await supabase.from('user_civic_stats').upsert(
      {
        user_id: user.id,
        civic_xp: newXp,
        bills_tracked_count: newCount,
        current_streak: streak,
        longest_streak: Math.max(stats?.longest_streak ?? 0, streak),
        last_action_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        alreadyTracked: false,
        xpAwarded: 25,
        totalXp: newXp,
        currentStreak: streak,
        billsTracked: newCount,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[track-bill]', e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
