import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { sendTemplateEmail } from './transactional-email-templates/send-email.ts';
import { normalizeEmail, validEmail, riderEmailData } from './rider-email-content.ts';
export async function sendRiderEmail(db:SupabaseClient, id:string, kind:'confirmation'|'reminder'|'rights', attempt=crypto.randomUUID(), oneOff?:string) {
 const note = async (reason:string) => { await db.from('ride_events').insert({request_id:id,event_type:'rider_email_note',note:reason}); };
 try {
  const {data:r,error} = await db.from('ride_requests').select('id,email,ride_code,ride_day,pickup_time,status,card_token,destination_site_id,needs_destination,quiz_score,quiz_finished_at').eq('id',id).single();
  if(error||!r) return {status:'not_found'};
  if(kind!=='rights'&&!['requested','booked'].includes(r.status)) return {status:'skipped'};
  if(kind==='rights'&&!r.quiz_finished_at) return {status:'quiz_required'};
  const email=normalizeEmail(oneOff??r.email??''); if(!email||!validEmail(email)) return {status:'email_required'};
  let place:{name:string;address:string;state?:string}|null=null;
  if(r.destination_site_id&&!r.needs_destination){const {data:s}=await db.from('voter_guide_sites').select('name,address,state').eq('id',r.destination_site_id).eq('verification_status','verified').maybeSingle();place=s;}
  let takeaways:string[]=[];
  if(kind==='rights'){const {data:q,error:qe}=await db.from('rights_questions').select('takeaway').eq('state',place?.state??'MO').not('approved_at','is',null).order('sort');if(qe||!q?.length)return {status:'rights_unavailable'};takeaways=q.map(x=>x.takeaway);}
  const key=Deno.env.get('LOVABLE_API_KEY'); if(!key)return {status:'not_sent'};
  const hmac=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',hmac,new TextEncoder().encode('rider-email:'+email)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const {data:claim,error:ce}=await db.rpc('claim_rider_email',{_ride:id,_kind:kind,_hash:hash,_attempt:attempt});
  if(ce)return {status:'not_sent'};if(claim!=='claimed')return {status:claim};
  const result=await sendTemplateEmail(`rider-${kind}`,email,{templateData:riderEmailData(kind,r,place,takeaways),idempotencyKey:`rider-${kind}-${id}${kind==='rights'?'-'+attempt:''}`});
  if(!result.sent){await note('email_suppressed');return {status:'suppressed'};}
  await db.from('ride_events').insert({request_id:id,event_type:'rider_email_sent',note:kind});
  return {status:result.status??'accepted',messageId:result.messageId};
 }catch{try{await note('email_failed');}catch{}return {status:'not_sent'};}
}
export function startRiderConfirmation(db:SupabaseClient,id:string){
 const task=sendRiderEmail(db,id,'confirmation').catch(()=>({status:'not_sent'}));
 const runtime=(globalThis as unknown as {EdgeRuntime?:{waitUntil:(task:Promise<unknown>)=>void}}).EdgeRuntime;
 runtime?.waitUntil(task);
}