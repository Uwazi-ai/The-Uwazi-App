import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY = 'https://connector-gateway.lovable.dev/google_search_console';
const SITE_URL = 'https://uwaziapp.uwazi.ai/';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const gscKey = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY');

  const result: Record<string, unknown> = {
    site_url: SITE_URL,
    connected: Boolean(lovableKey && gscKey),
    lovable_api_key_present: Boolean(lovableKey),
    gsc_api_key_present: Boolean(gscKey),
    sites: null as unknown,
    site_in_console: false,
    verification: null as unknown,
    verified: false,
    errors: [] as string[],
  };

  if (!result.connected) {
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    'X-Connection-Api-Key': gscKey!,
  };

  // List sites in Search Console
  try {
    const r = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
    const body = await r.json();
    if (r.ok) {
      result.sites = body.siteEntry ?? [];
      const match = (body.siteEntry ?? []).find((s: { siteUrl: string }) => s.siteUrl === SITE_URL);
      result.site_in_console = Boolean(match);
      if (match) result.permission_level = match.permissionLevel;
    } else {
      (result.errors as string[]).push(`sites: ${r.status} ${JSON.stringify(body)}`);
    }
  } catch (e) {
    (result.errors as string[]).push(`sites: ${(e as Error).message}`);
  }

  // Check verification
  try {
    const encoded = encodeURIComponent(SITE_URL);
    const r = await fetch(`${GATEWAY}/siteVerification/v1/webResource/${encoded}`, { headers });
    if (r.ok) {
      result.verification = await r.json();
      result.verified = true;
    } else {
      const body = await r.json().catch(() => ({}));
      result.verification = body;
      result.verified = false;
    }
  } catch (e) {
    (result.errors as string[]).push(`verification: ${(e as Error).message}`);
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
