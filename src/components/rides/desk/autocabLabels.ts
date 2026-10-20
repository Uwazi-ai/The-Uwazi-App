export type AutocabAccount = { customerId: number; displayName: string | null; accountCode: string | null; accountType: string | null; active: boolean };
export type AutocabCapability = { id: number; name: string | null; shortCode: string | null };
export type AutocabDriver = { id: number; callsign: string | null; companyId: number | null; active: boolean };
export type AutocabCompany = { id: number; name: string | null };
export type AutocabLists = { customerAccounts: AutocabAccount[]; capabilities: AutocabCapability[]; drivers: AutocabDriver[]; companies: AutocabCompany[]; verified_at?: string; expected_account_code?: string; expected_found?: boolean };

export const accountLabel = (a: AutocabAccount) => `${a.accountCode ?? '?'}: ${a.displayName ?? 'No name'} (id ${a.customerId})`;
export const capabilityLabel = (c: AutocabCapability) => `${c.name ?? 'No name'} (${c.shortCode ?? '?'}), id ${c.id}`;
export const driverLabel = (d: AutocabDriver) => `callsign ${d.callsign ?? '?'}, id ${d.id}`;
export const companyLabel = (c: AutocabCompany) => `company ${c.name ?? 'No name'}, id ${c.id}`;

export const VERIFY_WINDOW_MS = 10 * 60 * 1000;
/** Why LIVE is refused, or null when allowed. Mirrors validate_autocab_settings. */
export function liveBlockReason(opts: { customerId: number | null; expectedCode: string; verifiedAt: string | null; verifiedAccounts: Record<string, unknown>; now?: number }): string | null {
  const now = opts.now ?? Date.now();
  if (!opts.customerId) return 'Choose a customer account first.';
  const at = opts.verifiedAt ? Date.parse(opts.verifiedAt) : NaN;
  if (!Number.isFinite(at) || now - at > VERIFY_WINDOW_MS) return 'Run Test connection within the last 10 minutes.';
  if (opts.verifiedAccounts[String(opts.customerId)] !== opts.expectedCode) return `Select account ${opts.expectedCode} before LIVE.`;
  return null;
}
