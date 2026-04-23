import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { congress, billType, billNumber } = await req.json();

    if (!congress || !billType || !billNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing congress, billType, or billNumber' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const key = Deno.env.get('CONGRESS_API_KEY');
    if (!key) throw new Error('CONGRESS_API_KEY not set');

    const type = String(billType).toLowerCase();
    const url = `https://api.congress.gov/v3/bill/${congress}/${type}/${billNumber}?format=json&api_key=${key}`;

    const r = await fetch(url);
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.error(`[bill-detail] Congress.gov ${r.status}:`, errText);
      throw new Error(`upstream_error_${r.status}`);
    }

    const json = await r.json();

    // Try to fetch summary text too
    let summaryText: string | undefined;
    try {
      const sr = await fetch(
        `https://api.congress.gov/v3/bill/${congress}/${type}/${billNumber}/summaries?format=json&api_key=${key}`
      );
      if (sr.ok) {
        const sj = await sr.json();
        const last = sj?.summaries?.[sj.summaries.length - 1];
        if (last?.text) summaryText = String(last.text).replace(/<[^>]+>/g, '').trim();
      }
    } catch {
      /* ignore */
    }

    if (summaryText && json?.bill) {
      json.bill.summary = { text: summaryText };
    }

    return new Response(JSON.stringify({ ok: true, raw: json }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[bill-detail]', e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
