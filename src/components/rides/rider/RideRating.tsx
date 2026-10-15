import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function RideRating({ saved, onSave }: { saved?: number | null; onSave: (rating: number) => Promise<string | void> }) {
 const [rating, setRating] = useState(saved ?? 0); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
 const save=async(n:number)=>{if(busy)return;setRating(n);setBusy(true);try {const error=await onSave(n);setMessage(error||'Rating saved. Thank you.');}catch{setMessage('That did not save. Please try again.');}finally{setBusy(false);}};
 return <section className="space-y-2"><h2 className="text-sm font-semibold">How was your ride?</h2><div className="flex justify-center gap-2" role="radiogroup" aria-label="Rate your ride from 1 to 5 stars">{[1,2,3,4,5].map(n=><Button key={n} role="radio" aria-checked={rating===n} disabled={busy} variant="ghost" className="rider-star size-11 p-0" aria-label={`${n} ${n===1?'star':'stars'}`} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();void save(Math.max(1,Math.min(5,n+(e.key==='ArrowRight'?1:-1))));}}} onClick={()=>void save(n)}><Star className={`size-7 ${n<=rating?'rider-star-filled':''}`}/></Button>)}</div><p role="status" className="rider-muted text-xs">{message}</p></section>;
}
