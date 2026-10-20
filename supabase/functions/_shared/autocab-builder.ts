// Pure, allowlisted outbound booking builder. Never serializes a ride row.
export type BookingAddress = { coordinate: { latitude: number; longitude: number }; zone: Record<string, unknown> | number; [key: string]: unknown };
export type DispatchRider = { id: string; ride_code: string; first_name_last_initial: string; phone: string; pickup_address: string; zip: string; ride_day: string; pickup_time: string; needs: string[]; destination_site_id: string | null; needs_destination: boolean; status: string; provider: string; autocab_booking_id?: string | null; autocab_operation_id?: string | null };
export type DispatchSettings = { autocab_customer_id: number | null; autocab_company_id: number; autocab_driver_id: number | null; autocab_capability_map: Record<string, number>; autocab_live: boolean; autocab_base_capability_id?: number | null };
// Only wheelchair must map to a capability. Other needs travel in the driver note.
export const REQUIRED_CAPABILITY_NEEDS = ['wheelchair'];
export function chicagoUtc(day: string, time: string): string {
  const wall = Date.parse(`${day}T${time.slice(0, 5)}:00Z`);
  if (!Number.isFinite(wall)) throw new Error('Invalid pickup time');
  let utc = wall;
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(utc)).map(x => [x.type, x.value]));
    const local = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    utc += wall - local;
  }
  return new Date(utc).toISOString();
}
export function e164(phone: string): string {
  const d = phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (!/^[2-9]\d{9}$/.test(d)) throw new Error('Invalid rider phone. Book by phone.');
  return `+1${d}`;
}
export function validateGroup(riders: DispatchRider[]) {
  const lead = riders[0];
  if (!lead || riders.length > 3 || new Set(riders.map(r => r.id)).size !== riders.length) throw new Error('Choose one trip with 1 to 3 riders.');
  if (riders.some(r => !['requested', 'booked'].includes(r.status) || r.provider !== 'ztrip' || r.needs_destination || !r.destination_site_id || r.ride_day !== lead.ride_day || r.pickup_time !== lead.pickup_time || r.destination_site_id !== lead.destination_site_id)) throw new Error('Choose riders with the same pickup time and voting place.');
}
export function buildBooking(riders: DispatchRider[], pickups: BookingAddress[], destination: BookingAddress, settings: DispatchSettings) {
  validateGroup(riders);
  if (!settings.autocab_customer_id || settings.autocab_company_id < 1) throw new Error('Choose an Autocab customer account first.');
  if (pickups.length !== riders.length) throw new Error('Resolve every address first.');
  const lead = riders[0];
  if (!lead) throw new Error('No riders.');
  const note = (r: DispatchRider) => r.needs.length ? `Access needs: ${r.needs.join(', ')}` : '';
  const pickupDueTimeUtc = chicagoUtc(lead.ride_day, lead.pickup_time);
  const pickupDueTime = `${lead.ride_day}T${lead.pickup_time.slice(0, 5)}:00`;
  const needs = [...new Set(riders.flatMap(r => r.needs))].sort((a, b) => a === 'wheelchair' ? -1 : b === 'wheelchair' ? 1 : a.localeCompare(b));
  const base = settings.autocab_base_capability_id;
  if (base != null && (!Number.isInteger(base) || base < 1)) throw new Error('Dispatch capability id must be a positive whole number.');
  if (needs.some(n => REQUIRED_CAPABILITY_NEEDS.includes(n) && !settings.autocab_capability_map[n])) throw new Error('Map wheelchair to a capability, or book by phone.');
  const capabilities = [...new Set([...needs.flatMap(n => settings.autocab_capability_map[n] ? [settings.autocab_capability_map[n]] : []), ...(base ? [base] : [])])];
  return {
    name: lead.first_name_last_initial, telephoneNumber: e164(lead.phone),
    pickup: { address: pickups[0], note: note(lead), passengerDetailsIndex: null, type: 'Pickup' },
    vias: riders.slice(1).map((r, i) => ({ address: pickups[i + 1], completed: false, note: note(r), passengerDetailsIndex: i + 1, type: 'Pickup' })),
    extraPassengerDetails: riders.slice(1).map(r => ({ customerId: settings.autocab_customer_id, driverNote: note(r), dropOffTime: '', dropOffTimeUtc: '', name: r.first_name_last_initial, ourReference: r.ride_code, pickupDueTime, pickupDueTimeUtc, ringTextRequests: 0, telephoneNumber: e164(r.phone), yourReference: r.ride_code })),
    destination: { address: destination, note: 'UWAZI Poll Rides. Outbound only.', passengerDetailsIndex: null, type: 'Destination' },
    passengers: String(riders.length), pickupDueTime, pickupDueTimeUtc, customerId: settings.autocab_customer_id,
    yourReferences: { yourReference1: riders.map(r => r.ride_code).join(', '), yourReference2: 'UWAZI Poll Rides' },
    ourReference: riders.map(r => r.ride_code).join(', '), companyId: settings.autocab_company_id,
    bookingSource: 'ThirdPartyWebsite', ...(settings.autocab_driver_id ? { driverConstraints: { requestedDrivers: [settings.autocab_driver_id] } } : {}), capabilities, hold: !settings.autocab_live,
  };
}
export function redactError(text: string, key?: string): string {
  let safe = key ? text.split(key).join('[redacted]') : text;
  safe = safe.replace(/\+?1?[\s.(\-]*\d{3}[\s.)\-]*\d{3}[\s.\-]*\d{4}/g, '[phone removed]');
  return safe.slice(0, 1500);
}
export function safeTrackingLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}

const list = (v: any): any[] => Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : Array.isArray(v?.data) ? v.data : [];
const int = (v: unknown) => typeof v === 'number' && Number.isInteger(v) ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null;
const str = (v: unknown) => typeof v === 'string' ? v.slice(0, 120) : typeof v === 'number' ? String(v) : null;
export function safeTestLists(raw: { capabilities: unknown; customerAccounts: unknown; drivers: unknown; companies: unknown }) {
  return {
    customerAccounts: list(raw.customerAccounts).map(x => ({ customerId: int(x?.customerId), displayName: str(x?.displayName), accountCode: str(x?.accountCode), accountType: str(x?.accountType), active: x?.active === true })).filter(x => x.customerId !== null) as { customerId: number; displayName: string | null; accountCode: string | null; accountType: string | null; active: boolean }[],
    capabilities: list(raw.capabilities).map(x => ({ id: int(x?.id), name: str(x?.name), shortCode: str(x?.shortCode) })).filter(x => x.id !== null) as { id: number; name: string | null; shortCode: string | null }[],
    drivers: list(raw.drivers).map(x => ({ id: int(x?.id), callsign: str(x?.callsign), companyId: int(x?.companyId), active: x?.active === true })).filter(x => x.id !== null) as { id: number; callsign: string | null; companyId: number | null; active: boolean }[],
    companies: list(raw.companies).map(x => ({ id: int(x?.id), name: str(x?.name) })).filter(x => x.id !== null) as { id: number; name: string | null }[],
  };
}
