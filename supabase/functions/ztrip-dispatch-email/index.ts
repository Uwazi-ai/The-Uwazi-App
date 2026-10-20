import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { dispatchData,sampleRide,samplePlace,sampleRecipient,DISPATCH_REPLY_TO,type DispatchMeta } from '../_shared/ztrip-email-content.ts';
import { processDispatch } from '../_shared/ztrip-dispatch-send.ts';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('sample'),sampleId:z.string().uuid()}).strict(),z.object({action:z.literal('event'),eventId:z.string().uuid()}).strict()]);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed.'},405);
 const raw=await req.text();if(raw.length>2048)return json({error:'Request too large.'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 const parsed=schema.safeParse(body);if(!parsed.success)return json({error:'Invalid request.'},400);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anon=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!key||!anon)return json({error:'Email unavailable.'},503);
 const db=createClient(url,key);
 if(parsed.data.action==='sample'){
  const authorization=req.headers.get('Authorization')||'';
  const uc=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const {data:{user}}=await uc.auth.getUser();if(!user)return json({error:'Please sign in.'},401);
  const {data:admin}=await uc.rpc('is_admin',{_user_id:user.id});
  const recipient=sampleRecipient(Boolean(admin),user.email);if(!recipient)return json({error:'Admins only.'},403);
  const sampleId=parsed.data.sampleId;
  try{
   const {data:claim,error}=await db.rpc('claim_ztrip_dispatch_email',{_sample_actor:user.id,_sample_id:sampleId});
   if(error||claim!=='claimed')return json({status:error?'not_sent':claim});
   const sent=await sendTemplateEmail('ztrip-dispatch',recipient,{templateData:dispatchData(sampleRide,samplePlace,{kind:'new'},['UZ-9001'],3,true),idempotencyKey:`ztrip-sample-${sampleId}`,replyTo:DISPATCH_REPLY_TO});
   return json(sent.sent?{status:sent.status||'accepted',messageId:sent.messageId,provider:'Lovable Emails'}:{status:'suppressed'});
  }catch{return json({status:'not_sent'},502);}
 }
 const supplied=req.headers.get('x-ztrip-dispatch-token');
 const {data:token}=supplied?await db.from('system_job_token').select('token').eq('id',true).single():{data:null};
 if(!supplied||supplied!==token?.token)return json({error:'Not allowed.'},403);
 const eventId=parsed.data.eventId;
 let rideId:string|undefined;
 const task=processDispatch({
  load:async()=>{
   const {data:e}=await db.from('ride_events').select('request_id,note').eq('id',eventId).eq('event_type','ztrip_dispatch_event').single();if(!e)return null;rideId=e.request_id;
   const metaSchema=z.object({kind:z.enum(['new','changed','cancelled','home']),changed:z.array(z.string()).max(4),oldDay:z.string().nullable(),oldTime:z.string().nullable(),fingerprint:z.string()});
   const meta=metaSchema.safeParse(JSON.parse(e.note||'{}'));if(!meta.success)return null;
   const [{data:r},{data:s},{count:prior}]=await Promise.all([
    db.from('ride_requests').select('ride_code,ride_day,pickup_time,first_name_last_initial,phone,pickup_address,zip,needs,needs_destination,round_trip,status,trip_stage,destination_site_id,created_at').eq('id',rideId).single(),
    db.from('ride_settings').select('ztrip_dispatch_email,ztrip_dispatch_enabled,ztrip_email_on_changes,ztrip_email_ride_home,seats_per_slot').eq('id',true).single(),
    db.from('ride_events').select('id',{count:'exact',head:true}).eq('request_id',rideId).eq('event_type','ztrip_emailed').like('note','new|%')]);
   if(!r||!s)return null;
   const [{data:site},{data:others}]=await Promise.all([
    r.destination_site_id?db.from('voter_guide_sites').select('name,address').eq('id',r.destination_site_id).eq('verification_status','verified').single():Promise.resolve({data:null}),
    db.from('ride_requests').select('ride_code').eq('ride_day',r.ride_day).eq('pickup_time',r.pickup_time).eq('provider','ztrip').in('status',['requested','booked','riding','completed']).lte('created_at',r.created_at).neq('id',rideId)]);
   return {ride:r,site,meta:meta.data as DispatchMeta,settings:s,priorSent:Boolean(prior),otherCodes:(others||[]).map(x=>x.ride_code)};
  },
  claim:async()=>{const {data,error}=await db.rpc('claim_ztrip_dispatch_email',{_event_id:eventId});if(error)throw new Error('claim_failed');return data;},
  send:(recipient,data)=>sendTemplateEmail('ztrip-dispatch',recipient,{templateData:data,idempotencyKey:`ztrip-dispatch-${eventId}`,replyTo:DISPATCH_REPLY_TO}),
  note:async(sent,kind)=>{if(rideId)await db.from('ride_events').insert({request_id:rideId,event_type:sent?'ztrip_emailed':'note',note:sent?`${kind}|${eventId}`:'ztrip_email_failed'});}
 });
 const runtime=(globalThis as unknown as {EdgeRuntime?:{waitUntil:(p:Promise<unknown>)=>void}}).EdgeRuntime;
 runtime?.waitUntil(task);
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return json(await Promise.race([task,new Promise(resolve=>{timer=setTimeout(()=>resolve({status:'pending'}),5000);})]));}finally{if(timer)clearTimeout(timer);}
});
