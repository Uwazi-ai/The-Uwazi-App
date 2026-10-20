import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {supabase} from '@/integrations/supabase/client';
import {Copy,Link2,MapPin,RefreshCw,ShieldOff} from 'lucide-react';
import {smsHref} from '../ztripText';
import type {AutocabStatus} from '../autocabClient';
import {driverState} from '../../../../../supabase/functions/_shared/driver-tracking-policy';
import {useDriverTracking} from './useDriverTracking';
import {DriverMap} from './DriverMap';
import type {DriverSession,MapCar} from './types';
export function trackingCars(sessions:DriverSession[],autocab:Record<string,AutocabStatus>,now:number):MapCar[]{return [...sessions.filter(s=>s.latest&&!s.revoked_at&&!s.stopped_at&&Date.parse(s.expires_at)>now).map(s=>({id:s.id,label:s.label,source:'share' as const,lat:s.latest?.lat??0,lng:s.latest?.lng??0,updatedAt:s.latest?.received_at??s.last_seen_at??s.created_at,trail:s.trail})),...Object.entries(autocab).flatMap(([id,s])=>s.position&&Number.isFinite(s.position.lat)&&Number.isFinite(s.position.lon)&&s.updatedAt?[{id:`autocab-${id}`,label:'Autocab',source:'autocab' as const,lat:s.position.lat,lng:s.position.lon,updatedAt:s.updatedAt,trail:[]}]:[])];}
export function DriverTrackingPanel({phone,autocab={},rideId}:{phone?:string|null;autocab?:Record<string,AutocabStatus>;rideId?:string}){
 const {sessions,pins,error,now,refresh}=useDriverTracking(rideId);const [link,setLink]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState<string|null>(null),[label,setLabel]=useState('zTrip car');
 const cars=useMemo(()=>trackingCars(sessions,autocab,now),[sessions,autocab,now]);
 const create=async()=>{setBusy(true);setMessage(null);try{const {data,error}=await supabase.functions.invoke('driver-session-create',{body:{label}});if(error||!data?.link)setMessage('The link was not created.');else{setLink(data.link);await refresh();}}catch{setMessage('The link was not created.');}finally{setBusy(false);}};
 const revoke=async(id:string)=>{setBusy(true);try{const {error}=await supabase.functions.invoke('driver-session-revoke',{body:{session_id:id}});if(error)setMessage('Could not revoke the link.');else{setMessage('Link revoked. Saved points were removed.');await refresh();}}catch{setMessage('Could not revoke the link.');}finally{setBusy(false);}};
 return <section className="mt-6 min-w-0 space-y-4 border-y border-border py-5" aria-label="Driver tracking"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-heading text-2xl"><MapPin className="h-5 w-5 text-primary"/>Driver tracking</h2><Button variant="ghost" size="icon" title="Refresh driver tracking" aria-label="Refresh driver tracking" onClick={()=>void refresh()}><RefreshCw className="h-4 w-4"/></Button></div>
 {!rideId&&<div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><label htmlFor="driver-link-label" className="mb-2 block text-sm">Car label</label><Input id="driver-link-label" value={label} maxLength={80} onChange={e=>setLabel(e.target.value)} className="min-h-11"/></div><Button disabled={busy||!label.trim()} onClick={create}><Link2 className="mr-2 h-4 w-4"/>{sessions.length?'New link':'Create link'}</Button></div>}
 {sessions.length===0&&<p role="status" className="text-sm text-muted-foreground">Not created</p>}
 {!rideId&&sessions.map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><b className="break-words">{s.label}</b><p role="status" className={s.last_seen_at&&now-Date.parse(s.last_seen_at)>120000?'text-sm text-muted-foreground':'text-sm text-primary'}>{driverState(s,now)}</p></div>{!s.revoked_at&&Date.parse(s.expires_at)>now&&<Button variant="outline" disabled={busy} onClick={()=>void revoke(s.id)}><ShieldOff className="mr-2 h-4 w-4"/>Revoke</Button>}</div>)}
 {(error||message)&&<p role="status" className="text-sm text-muted-foreground">{error??message}</p>}<DriverMap cars={cars} pins={pins} now={now}/>
 <Dialog open={Boolean(link)} onOpenChange={o=>{if(!o)setLink(null);}}><DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg"><DialogHeader><DialogTitle>Driver share link</DialogTitle><DialogDescription>Copy this link now. It cannot be retrieved after you close this window. A new link replaces today's old link.</DialogDescription></DialogHeader><p className="break-all text-sm" aria-label="Driver share link">{link}</p><div className="flex flex-wrap gap-2"><Button onClick={async()=>{if(!link)return;try{await navigator.clipboard.writeText(link);setMessage('Link copied.');}catch{setMessage('Select the link to copy it.');}}}><Copy className="mr-2 h-4 w-4"/>Copy link</Button>{phone&&link&&<Button variant="outline" asChild><a href={smsHref(phone,`UWAZI: driver, please open this link on your phone and tap Start sharing. It shares the car's location with the ride coordinator today only: ${link}`)}>Text zTrip</a></Button>}</div></DialogContent></Dialog>
 </section>;
}
