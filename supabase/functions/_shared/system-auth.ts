// Shared check for scheduled system jobs: a scheduled call carries the private
// job token from system_job_token, a manual call must come from a super admin.
// deno-lint-ignore-file no-explicit-any
export async function authorizeSystemJob(req: Request, db: any): Promise<{ ok: boolean; manual: boolean; userId?: string }> {
  const jobToken = req.headers.get('x-job-token');
  if (jobToken) {
    const { data } = await db.from('system_job_token').select('token').eq('id', true).maybeSingle();
    if (data?.token && data.token === jobToken) return { ok: true, manual: false };
    return { ok: false, manual: false };
  }
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: u } = await db.auth.getUser(token);
  if (!u?.user) return { ok: false, manual: true };
  const { data: isSuper } = await db.rpc('has_role', { _user_id: u.user.id, _role: 'super_admin' });
  return { ok: !!isSuper, manual: true, userId: u.user.id };
}
