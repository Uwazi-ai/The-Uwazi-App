import html2canvas from 'html2canvas-pro';
import type { RightsQuestion } from '@/lib/rideExperience';
import { RIDE_PUBLIC_URL, RIDE_LINE, downloadBlob } from '@/lib/rideExperience';
export async function saveRightsCard(questions: RightsQuestion[]) {
 if (!questions.length) throw new Error('No reviewed takeaways available');
 const host = document.createElement('section');
 host.className = 'rider-experience rider-rights-download';
 const heading = document.createElement('h1'); heading.className = 'font-heading'; heading.textContent = 'KNOW YOUR RIGHTS'; host.append(heading);
 for (const question of questions) { const row = document.createElement('p'); row.textContent = question.takeaway; host.append(row); }
 const footer = document.createElement('p'); footer.textContent = `Missouri voting rights. Questions? Call ${RIDE_LINE}.`; host.append(footer);
 document.body.append(host);
 try { await document.fonts.ready; const canvas = await html2canvas(host, { scale: 3 }); const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png')); if (!blob) throw new Error('PNG unavailable'); downloadBlob(blob, 'uwazi-voting-rights.png'); } finally { host.remove(); }
}
export async function shareRideLink() { try { const data={title:'UWAZI free rides',text:`Free rides for voters who live in Kansas City, in Jackson County. Call ${RIDE_LINE}.`,url:RIDE_PUBLIC_URL};if(navigator.share)await navigator.share(data);else await navigator.clipboard.writeText(`${data.text} ${data.url}`); } catch { /* User may dismiss sharing. */ } }
export async function shareRideCard() { const element=document.getElementById('ride-completion-share-card');if(!element)return;await document.fonts.ready;const canvas=await html2canvas(element,{scale:3,backgroundColor:null});const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)return;const file=new File([blob],'uwazi-ride-card.png',{type:'image/png'});try { if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'I rode to the polls with UWAZI'});else downloadBlob(blob,file.name); } catch { /* Dismissed share. */ } }