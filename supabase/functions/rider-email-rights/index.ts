import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { CodeToken, rideByToken, json, notFound } from '../_shared/ride-token.ts';
import { sendRiderEmail } from '../_shared/rider-emails.ts';
const Body=z.object({...CodeToken,attempt:z.string().uuid(),email:z.string().trim().toLowerCase().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).optional()}).strict();
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed.'},405);
 const p=Body.safeParse(await req.json().catch(()=>null));if(!p.success)return json({error:'Check your email address.'},400);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return json({status:'not_sent'},503);
 const db=createClient(url,key);const r=await rideByToken(db,p.data.ride_code,p.data.t,'id,email');if(!r)return notFound();
 const result=await sendRiderEmail(db,r.id,'rights',p.data.attempt,r.email?undefined:p.data.email);return json(result);
});