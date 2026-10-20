import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { json } from '../_shared/ride-token.ts';
import { sendRiderEmail } from '../_shared/rider-emails.ts';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});if(req.method!=='POST')return json({error:'Method not allowed.'},405);
 const p=z.object({ride_id:z.string().uuid()}).strict().safeParse(await req.json().catch(()=>null));if(!p.success)return json({error:'Invalid ride.'},400);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!anon||!key)return json({status:'not_sent'},503);
 const authorization=req.headers.get('Authorization')??'';const uc=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
 const {data:c}=await uc.auth.getClaims(authorization.replace(/^Bearer /,''));const uid=c?.claims?.sub;if(!uid)return json({error:'Please sign in.'},401);
 const {data:admin}=await uc.rpc('is_admin',{_user_id:uid});if(!admin)return json({error:'Admins only.'},403);
 const db=createClient(url,key);const {data:r}=await db.from('ride_requests').select('email').eq('id',p.data.ride_id).single();if(r?.email!=='myke@uwazi.ai')return json({error:'Test recipient only.'},403);
 return json(await sendRiderEmail(db,p.data.ride_id,'reminder'));
});