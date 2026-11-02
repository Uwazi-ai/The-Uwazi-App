// Keyed hash rate limit for public endpoints. Only a keyed hash of the
// caller IP is stored, never the IP itself.
// deno-lint-ignore-file no-explicit-any
export async function keyedHash(value: string): Promise<string> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'uwazi';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function callerIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
}

/** Returns true when the caller is under the limit and records the hit. */
export async function underLimit(db: any, bucket: string, req: Request, max: number, windowMinutes: number): Promise<boolean> {
  const key_hash = await keyedHash(`${bucket}:${callerIp(req)}`);
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count } = await db.from('public_rate_hits').select('id', { count: 'exact', head: true })
    .eq('bucket', bucket).eq('key_hash', key_hash).gte('created_at', since);
  if ((count ?? 0) >= max) return false;
  await db.from('public_rate_hits').insert({ bucket, key_hash });
  return true;
}
