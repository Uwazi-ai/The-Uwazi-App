import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const SYSTEM = `You are Uwazi, a nonpartisan civic AI. Explain U.S. legislation at an 8th-grade reading level. Never take a political side. Never use jargon without defining it.

Return ONLY a JSON object with exactly two keys:
- "plain_summary": 2 short paragraphs (max 120 words). What the bill does, who it affects, what changes if it passes. No headers, no bullets, no markdown.
- "community_impact_template": 1 paragraph (max 80 words) describing kinds of people and communities most likely to feel effects. Use {city}, {state}, {zip} as placeholders for local context. Stay neutral.

No preamble. No markdown. JSON only.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { billId, jurisdiction, number, title, fullText } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: cached } = await supabase
      .from('bill_summaries')
      .select('plain_summary, community_impact_template')
      .eq('bill_id', String(billId))
      .eq('jurisdiction', jurisdiction ?? 'federal')
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ ok: true, cached: true, ...cached }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) throw new Error('LOVABLE_API_KEY not set');

    const userMsg = `Bill ${number ?? ''}: ${title}\n\nSummary/text:\n${(fullText ?? title).slice(0, 8000)}`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userMsg },
        ],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Lovable AI ${r.status}: ${errText}`);
    }

    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content ?? '';
    let parsed: { plain_summary: string; community_impact_template: string };
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('Model returned invalid JSON');
    }

    await supabase.from('bill_summaries').upsert(
      {
        bill_id: String(billId),
        jurisdiction: jurisdiction ?? 'federal',
        plain_summary: parsed.plain_summary,
        community_impact_template: parsed.community_impact_template,
      },
      { onConflict: 'bill_id,jurisdiction' }
    );

    return new Response(JSON.stringify({ ok: true, cached: false, ...parsed }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[bill-summary]', e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
