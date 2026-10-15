import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function RideRating({ saved, onSave }: { saved?: number | null; onSave: (rating: number) => Promise<string | void> }) {
 const [rating, setRating] = useState(saved ?? 0); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
 return <section className="space-y-3"><h2 className="text-lg font-semibold">How was your ride?</h2><div className="flex gap-1" role="group" aria-label="Rate your ride from 1 to 5 stars">{[1,2,3,4,5].map(n => <Button key={n} variant="ghost" className="rider-star h-12 w-12 p-0" aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`} aria-pressed={rating === n} onClick={() => setRating(n)}><Star className={n <= rating ? 'rider-star-filled' : ''} /></Button>)}</div><Button className="rider-primary w-full" disabled={!rating || busy} onClick={async () => { setBusy(true); try { const error = await onSave(rating); setMessage(error || 'Rating saved. Thank you.'); } catch { setMessage('That did not save. Please try again.'); } finally { setBusy(false); } }}>{busy ? 'Saving...' : 'Save my rating'}</Button><p role="status" className="text-sm">{message}</p></section>;
}
