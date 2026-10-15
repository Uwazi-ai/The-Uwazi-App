import { useState } from 'react';
import { Copy, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RIDE_LINE, RIDE_PUBLIC_URL, downloadBlob } from '@/lib/rideExperience';
import { RideStageSheet } from './RideStageSheet';
import { RideCompletionCard } from './RideCompletionCard';
export function RideShareSheet({ open, onClose, completed, demo = false }: { open: boolean; onClose: () => void; completed: boolean; demo?: boolean }) {
 const [message, setMessage] = useState('');
 const text = completed ? `I rode to the polls with UWAZI. Ride line: ${RIDE_LINE}` : `Free rides for voters who live in Kansas City, in Jackson County. Call ${RIDE_LINE}.`;
 const download = async () => {
  await document.fonts.ready;
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350; const ctx = canvas.getContext('2d'); if (!ctx) return;
  const colors = getComputedStyle(document.querySelector('.rider-experience') ?? document.documentElement);
  ctx.fillStyle = `hsl(${colors.getPropertyValue('--rider-bg')})`; ctx.fillRect(0,0,1080,1350);
  ctx.fillStyle = `hsl(${colors.getPropertyValue('--rider-green')})`; ctx.font = '800 80px Axis';
  ['I rode to','the polls','with UWAZI'].forEach((line, i) => ctx.fillText(line,80,480 + i*110));
  ctx.font = '600 46px Arial, sans-serif'; ctx.fillText(RIDE_LINE,80,1080);
  canvas.toBlob(blob => { if (blob) downloadBlob(blob, 'uwazi-ride-card.png'); });
 };
 return <RideStageSheet open={open} onClose={onClose} title={completed ? 'Share the ride line' : 'Share free rides with a neighbor'} description="Only the public ride link is shared.">{completed && <RideCompletionCard />}<Button className="rider-primary w-full" onClick={async () => { if (demo) { setMessage('Demo share preview. Nothing was sent.'); return; } try { if (navigator.share) await navigator.share({ title: 'UWAZI free rides', text, url: RIDE_PUBLIC_URL }); else { await navigator.clipboard.writeText(text + ' ' + RIDE_PUBLIC_URL); setMessage('Public ride link copied.'); } } catch { setMessage('Sharing closed. You can copy the link instead.'); } }}><Share2 className="mr-2 size-5" />Share</Button><Button variant="outline" className="w-full min-h-12" onClick={async () => { try { if (!demo) await navigator.clipboard.writeText(RIDE_PUBLIC_URL); setMessage(demo ? 'Demo link preview.' : 'Public ride link copied.'); } catch { setMessage(RIDE_PUBLIC_URL); } }}><Copy className="mr-2 size-5" />Copy public link</Button>{completed && <Button variant="outline" className="w-full min-h-12" onClick={download}><Download className="mr-2 size-5" />Download my card</Button>}<p role="status" className="text-sm">{message}</p></RideStageSheet>;
}
