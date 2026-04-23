import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const congress = String(body?.congress ?? '').trim();
    const billType = String(body?.billType ?? '').trim().toLowerCase();
    const billNumber = String(body?.billNumber ?? '').trim();

    if (!congress || !billType || !billNumber || /[^a-z0-9]/i.test(billType) || !/^\d+$/.test(billNumber) || !/^\d+$/.test(congress)) {
      return json({ ok: false, error: 'Invalid bill parameters', fallback: true });
    }

    const key = Deno.env.get('CONGRESS_API_KEY');
    if (!key) {
      console.error('[bill-detail] CONGRESS_API_KEY not set');
      return json({ ok: false, error: 'Server misconfigured', fallback: true });
    }

    const url = `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}?format=json&api_key=${key}`;
    const r = await fetch(url);

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error(`[bill-detail] Congress.gov ${r.status} for ${congress}/${billType}/${billNumber}:`, errText);
      return json({
        ok: false,
        error: r.status === 404 ? 'Bill not found' : 'Unable to fetch bill details',
        fallback: true,
        status: r.status,
      });
    }

    const data = await r.json();

    // Try to fetch summary text too
    try {
      const sr = await fetch(
        `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}/summaries?format=json&api_key=${key}`
      );
      if (sr.ok) {
        const sj = await sr.json();
        const last = sj?.summaries?.[sj.summaries.length - 1];
        if (last?.text) {
          const summaryText = String(last.text).replace(/<[^>]+>/g, '').trim();
          if (data?.bill) data.bill.summary = { text: summaryText };
        }
      }
    } catch { /* ignore */ }

    return json({ ok: true, raw: data });
  } catch (e) {
    console.error('[bill-detail] Unexpected error:', e);
    return json({ ok: false, error: 'Unable to fetch bill details', fallback: true });
  }
});
