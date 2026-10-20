import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { autocabCall, type AutocabStatus } from './autocabClient';
import { NEED_LABELS, type Ride, type Settings } from './deskLib';
import { Send, RefreshCw, XCircle, Plug } from 'lucide-react';
type Option = { id: number; name: string };
export function AutocabConnection({ settings, onSettings }: { settings: Settings; onSettings: (s: Settings) => void }) {
  const [form, setForm] = useState(settings);
  const [map, setMap] = useState<Record<string, number>>(() => settings.autocab_capability_map as Record<string, number>);
  const [lists, setLists] = useState<{ capabilities: Option[]; customerAccounts: Option[]; drivers: Option[] } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [message, setMessage] = useState('');
  const [confirmLive, setConfirmLive] = useState(false);
  useEffect(() => { setForm(settings); setMap(settings.autocab_capability_map as Record<string, number>); }, [settings]);
  const save = async (live = settings.autocab_live) => {
    setBusy(true); setError(null); setMessage('');
    const { data, error: e } = await supabase.from('ride_settings').update({ autocab_base_url: form.autocab_base_url.trim(), autocab_customer_id: form.autocab_customer_id, autocab_company_id: form.autocab_company_id, autocab_driver_id: form.autocab_driver_id, autocab_capability_map: map, autocab_live: live }).eq('id',true).select('*').single();
    setBusy(false);
    if (e || !data) setError(e?.message ?? 'Settings did not save.'); else { onSettings(data); setMessage('Connection settings saved.'); }
  };
  const select = (field: 'autocab_customer_id' | 'autocab_driver_id', label: string, options: Option[]) => <label className="space-y-1 text-sm"><span>{label}</span><select className="rides-input w-full" value={form[field] ?? ''} onChange={e => setForm({ ...form, [field]: e.target.value ? Number(e.target.value) : null })}><option value="">Not set</option>{options.map(o => <option key={o.id} value={o.id}>{o.name} ({o.id})</option>)}</select></label>;
  return <section className="mt-8 space-y-4 border-t border-border pt-5" aria-labelledby="autocab-connection">
    <h2 id="autocab-connection" className="font-heading text-2xl">zTrip connection</h2>
    <p className="text-sm text-muted-foreground">{settings.autocab_live ? 'LIVE. Confirmed API bookings can dispatch a car.' : 'TEST. API bookings are held. No car is dispatched.'}</p>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1 text-sm">Booking API URL<Input value={form.autocab_base_url} onChange={e=>setForm({...form,autocab_base_url:e.target.value})}/></label>
      <label className="space-y-1 text-sm">Company id<Input type="number" min={1} value={form.autocab_company_id} onChange={e=>setForm({...form,autocab_company_id:Number(e.target.value)})}/></label>
      {lists ? <>{select('autocab_customer_id','Customer account',lists.customerAccounts)}{select('autocab_driver_id','Requested driver',lists.drivers)}</> : <>{(['autocab_customer_id','autocab_driver_id'] as const).map(f => <label key={f} className="space-y-1 text-sm">{f==='autocab_customer_id'?'Customer id':'Driver id (optional)'}<Input type="number" min={1} value={form[f]??''} onChange={e=>setForm({...form,[f]:e.target.value?Number(e.target.value):null})}/></label>)}</>}
      {Object.entries(NEED_LABELS).map(([need,label])=><label key={need} className="space-y-1 text-sm">{label} capability{lists ? <select className="rides-input w-full" value={map[need]??''} onChange={e=>setMap({...map,[need]:Number(e.target.value)})}><option value="">Not mapped</option>{lists.capabilities.map(o=><option key={o.id} value={o.id}>{o.name} ({o.id})</option>)}</select> : <Input type="number" min={1} value={map[need]??''} onChange={e=>setMap({...map,[need]:Number(e.target.value)})}/>}</label>)}
    </div>
    <div className="flex flex-wrap gap-3">
      <Button disabled={busy} variant="outline" onClick={()=>save()} className="min-h-12">Save connection</Button>
      <Button disabled={busy} variant="outline" className="min-h-12" onClick={async()=>{setBusy(true);setError(null);try{setLists(await autocabCall({action:'test'}));setMessage('Read-only connection test passed.');}catch(e){setError(e instanceof Error?e.message:'Connection failed.');}finally{setBusy(false);}}}><Plug/>Test connection</Button>
      <label className="flex min-h-12 items-center gap-3"><Switch disabled={busy} checked={settings.autocab_live} onCheckedChange={live=>live?setConfirmLive(true):save(false)} aria-label="Live dispatch"/>Live dispatch</label>
    </div>
    {lists && <div className="grid gap-3 md:grid-cols-3">{(['capabilities','customerAccounts','drivers'] as const).map(k=><div key={k}><h3 className="text-sm font-semibold">{k==='customerAccounts'?'Customer accounts':k==='drivers'?'Drivers':'Capabilities'}</h3><ul className="max-h-48 overflow-auto text-sm">{lists[k].length?lists[k].map(o=><li key={o.id}>{o.id}: {o.name}</li>):<li>No entries returned.</li>}</ul></div>)}</div>}
    {error&&<p role="alert" className="break-words text-sm text-destructive">{error}</p>}{message&&<p role="status" className="text-sm">{message}</p>}
    <AlertDialog open={confirmLive} onOpenChange={setConfirmLive}><AlertDialogContent><AlertDialogTitle>Turn on live dispatch?</AlertDialogTitle><AlertDialogDescription>Confirmed API bookings will no longer be held. zTrip may dispatch a car. Manual texting stays available.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Keep TEST</AlertDialogCancel><AlertDialogAction onClick={()=>save(true)}>Turn on LIVE</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
export function AutocabBooking({ rides, live, onChanged }: { rides: Ride[]; live: boolean; onChanged: () => void }) {
  const [quote,setQuote]=useState<{quote_id:string;price:unknown;mode:string;expires_at:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[confirm,setConfirm]=useState<'book'|'cancel'|null>(null);
  const booked=rides.find(r=>r.autocab_booking_id);
  const blocked=rides.some(r=>r.autocab_operation_id&&!r.autocab_booking_id);
  const valid=rides.length>0&&rides.length<=3&&rides.every(r=>r.provider==='ztrip'&&!r.needs_destination&&r.destination_site_id===rides[0].destination_site_id&&['requested','booked'].includes(r.status));
  const signature=JSON.stringify(rides.map(r=>[r.id,r.status,r.pickup_time,r.destination_site_id,r.needs,r.pickup_address,r.phone]));
  useEffect(()=>setQuote(null),[signature,live]);
  const run=async(action:'quote'|'book'|'cancel')=>{setBusy(true);setError(null);try{const result=await autocabCall(action==='cancel'?{action,booking_id:booked?.autocab_booking_id,confirm:true}:{action,ride_ids:rides.map(r=>r.id),...(action==='book'?{quote_id:quote?.quote_id,confirm:true}:{})});if(action==='quote')setQuote(result);else{setQuote(null);onChanged();}}catch(e){setError(e instanceof Error?e.message:'Autocab failed.');}finally{setBusy(false);}};
  return <div className="space-y-2 border-t border-border pt-3">
    {booked?<><Badge variant="outline">Booked in Autocab {booked.autocab_booking_id}</Badge><Button className="min-h-12 w-full" variant="outline" disabled={busy} onClick={()=>setConfirm('cancel')}><XCircle/>Cancel booking</Button></>:blocked?<p role="status" className="text-sm text-destructive">Send pending. Ask zTrip before retrying.</p>:<>
      <Button variant="outline" className="min-h-12 w-full" disabled={busy||!valid} onClick={()=>run('quote')}><RefreshCw/>{busy?'Connecting':'Get zTrip quote'}</Button>
      {quote&&<div className="flex flex-wrap items-center gap-2 text-sm"><span>Quote: {typeof quote.price==='object'?JSON.stringify(quote.price):String(quote.price)}</span><Badge variant="outline">{quote.mode}</Badge></div>}
      <Button className="min-h-12 w-full" disabled={busy||!quote||!valid||Date.parse(quote.expires_at)<Date.now()} onClick={()=>setConfirm('book')}><Send/>Send to zTrip (API)</Button>
    </>}
    {error&&<p role="alert" className="break-words text-sm text-destructive">{error} Manual Text zTrip is still available.</p>}
    <AlertDialog open={confirm!==null} onOpenChange={o=>!o&&setConfirm(null)}><AlertDialogContent><AlertDialogTitle>{confirm==='cancel'?'Cancel Autocab booking?':`Send ${live?'LIVE':'TEST'} booking?`}</AlertDialogTitle><AlertDialogDescription>{confirm==='cancel'?'This cancels the whole Autocab group. Rider status stays unchanged. Cancel and rebook to change a group.':live?'zTrip may dispatch a car. This sends names, phones and pickup addresses.':'This sends a held TEST booking. No car is dispatched.'}</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Back</AlertDialogCancel><AlertDialogAction onClick={()=>{if(confirm)run(confirm);}}>{confirm==='cancel'?'Cancel booking':'Confirm send'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
const STATUS_LABELS: Record<string,string> = { Unassigned:'Waiting for a driver', Assigned:'Driver assigned', Dispatched:'Driver on the way', EnRoute:'Driver on the way', Arrived:'Driver has arrived', PickedUp:'Rider in the car', OnBoard:'Rider in the car', Completed:'Trip complete', Cancelled:'Cancelled', NoShow:'No-show', Held:'Held (test booking)' };
export function friendlyAutocabStatus(raw?: string | null) {
  if (!raw) return 'Awaiting status';
  const key = raw.replace(/[\s_-]/g,'');
  const hit = Object.keys(STATUS_LABELS).find(k => k.toLowerCase() === key.toLowerCase());
  return hit ? STATUS_LABELS[hit] : raw;
}
export function formatPickupTime(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
}
export function AutocabDetails({ride,status,compact=false}:{ride:Ride;status?:AutocabStatus;compact?:boolean}) {
  if(!ride.autocab_booking_id)return null;
  const eta = formatPickupTime(status?.estimatedPickup);
  const mins = status?.estimatedPickup ? Math.round((Date.parse(status.estimatedPickup) - Date.now()) / 60000) : NaN;
  const updated = formatPickupTime(status?.updatedAt);
  const row = (label: string, value: string | null | undefined, empty: string) => <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value || <span className="font-normal text-muted-foreground">{empty}</span>}</dd></div>;
  return <div className="my-2 space-y-2 rounded-lg border border-border p-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="outline">zTrip</Badge><span className="font-semibold">{friendlyAutocabStatus(status?.status ?? ride.autocab_status)}</span></div>
    <dl className="space-y-1">
      {row('Driver', status?.driver, 'Not assigned yet')}
      {row('Vehicle', status?.vehicle, 'Not assigned yet')}
      {row('Est. pickup', eta ? `${eta}${Number.isFinite(mins) && mins >= 0 && mins <= 180 ? ` (in ${mins} min)` : ''}` : null, 'Not available yet')}
    </dl>
    {!compact&&status?.position&&<p className="text-muted-foreground">Car position: {status.position.lat.toFixed(4)}, {status.position.lon.toFixed(4)}</p>}
    {status?.trackingLink&&<a className="inline-flex min-h-11 items-center text-primary underline" href={status.trackingLink} target="_blank" rel="noopener noreferrer">Track on map</a>}
    {updated&&<p className="text-xs text-muted-foreground">Updated {updated}. Checks every minute.</p>}
    {status?.error&&<p role="status" className="text-destructive">{status.error}</p>}
  </div>;
}
