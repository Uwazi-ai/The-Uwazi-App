import { useState } from 'react';
import { Mail, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Settings } from './deskLib';
import { normalizeDispatchEmail } from '../../../../supabase/functions/_shared/ztrip-email-content';
export function ZtripDispatchSettings({settings,onSettings}:{settings:Settings;onSettings:(s:Settings)=>void}) {
 const [address,setAddress]=useState(settings.ztrip_dispatch_email);
 const [busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[message,setMessage]=useState('');
 const [sampleId]=useState(()=>crypto.randomUUID());
 const save=async(patch:Partial<Settings>)=>{
  setBusy(true);setMessage('');
  try {const {data,error}=await supabase.from('ride_settings').update(patch).eq('id',true).select('*').single();if(error||!data)setMessage('Dispatch settings were not saved.');else{onSettings(data);setAddress(data.ztrip_dispatch_email);setMessage('Dispatch settings saved.');}}catch{setMessage('Dispatch settings were not saved.');}finally{setBusy(false);}
 };
 const sample=async()=>{
  setBusy(true);setMessage('Sending sample to your email.');
  try{const {data,error}=await supabase.functions.invoke('ztrip-dispatch-email',{body:{action:'sample',sampleId}});setMessage(error?'Sample was not sent.':data?.status==='duplicate'?'Sample already requested.':`Sample ${data?.status||'not sent'}.${data?.messageId?` ID: ${data.messageId}`:''}`);}catch{setMessage('Sample was not sent.');}finally{setBusy(false);}
 };
 return <section aria-labelledby="ztrip-email-heading" className="mt-6 border-t border-border pt-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="ztrip-email-heading" className="flex items-center gap-2 font-heading text-xl"><Mail className="h-5 w-5 text-primary"/>zTrip dispatch email</h3><span className={`rounded px-2 py-1 text-sm font-semibold ${settings.ztrip_dispatch_enabled?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{settings.ztrip_dispatch_enabled?'ON':'OFF'}</span></div>
  <div className="mt-4 max-w-xl space-y-4">
   <Label htmlFor="ztrip-dispatch-recipient">Dispatch recipient</Label>
   <div className="flex flex-col gap-2 sm:flex-row"><Input id="ztrip-dispatch-recipient" type="email" maxLength={254} value={address} onChange={e=>setAddress(e.target.value)} className="min-h-11 min-w-0"/><Button variant="outline" disabled={busy} onClick={()=>{const email=normalizeDispatchEmail(address);if(email)save({ztrip_dispatch_email:email});else setMessage('Enter one valid email address.');}}><Save className="mr-2 h-4 w-4"/>Save recipient</Button></div>
   {([['ztrip_dispatch_enabled','Automatic dispatch emails'],['ztrip_email_on_changes','Email changes and cancellations'],['ztrip_email_ride_home','Email ride home ready']] as const).map(([key,label])=><div key={key} className="flex min-h-11 items-center justify-between gap-4"><Label htmlFor={key}>{label}</Label><Switch id={key} checked={settings[key]} disabled={busy} onCheckedChange={value=>key==='ztrip_dispatch_enabled'&&value?setConfirm(true):save({[key]:value})}/></div>)}
   <Button variant="outline" disabled={busy} onClick={sample}><Send className="mr-2 h-4 w-4"/>Send sample to me</Button>
   <p role="status" className="break-words text-sm">{message}</p>
  </div>
  <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Enable zTrip dispatch emails?</AlertDialogTitle><AlertDialogDescription>This emails rider names, phone numbers and pickup addresses to {settings.ztrip_dispatch_email}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep off</AlertDialogCancel><AlertDialogAction onClick={()=>save({ztrip_dispatch_enabled:true})}>Enable emails</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </section>;
}