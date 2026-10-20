import { useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { riderEmailSchema } from '@/lib/riderEmail';
export function RightsEmailAction({hasEmail,onEmail}:{hasEmail?:boolean;onEmail?:(attempt:string,email?:string)=>Promise<string>}) {
 const [open,setOpen]=useState(false),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const attempt=useRef<string|null>(null);
 if(!onEmail)return null;
 const send=async()=>{const parsed=riderEmailSchema.safeParse(email);if(!hasEmail&&(!parsed.success||!parsed.data)){setMessage('Enter a valid email address.');return;}setBusy(true);attempt.current??=crypto.randomUUID();try{const result=await onEmail(attempt.current,hasEmail?undefined:parsed.success?parsed.data:undefined);setMessage(result);}catch{setMessage('Email could not be sent. Your rights card is still here.');}finally{setBusy(false);}};
 return <div className="space-y-3"><Button className="rider-secondary w-full whitespace-normal" disabled={busy} onClick={()=>hasEmail?void send():setOpen(!open)}><Mail className="mr-2 size-4 shrink-0"/>Email me my rights card</Button>{open&&!hasEmail&&<><label className="block space-y-2"><span className="text-xs font-semibold">Email</span><input type="email" className="rider-input" value={email} maxLength={254} autoComplete="email" onChange={e=>{setEmail(e.target.value);attempt.current=null;}}/></label><p className="rider-muted text-xs">Used once for this rights card. Not saved.</p><Button className="rider-primary w-full" disabled={busy} onClick={()=>void send()}>{busy?'Sending':'Send rights card'}</Button></>}<p role="status" className="text-xs">{message}</p></div>;
}