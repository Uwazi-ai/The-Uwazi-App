import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { CodeToken,json,notFound,rideByToken } from '../_shared/ride-token.ts';
import { sendClaimedRideSms } from '../_shared/ride-sms.ts';
const Body=z.object(CodeToken).strict();
Deno.serve(async req=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST') return json({error:'Method not allowed'},405);
 const p=Body.safeParse(await req.json().catch(()=>null)); if(!p.success) return notFound();
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if(!url||!key) return json({error:'Texting is not available right now.'},503);
 const db=createClient(url,key); const ride=await rideByToken(db,p.data.ride_code,p.data.t,'id,status,quiz_finished_at'); if(!ride) return notFound();
 if(!ride.quiz_finished_at || ['cancelled','referred'].includes(ride.status)) return json({error:'Finish the quiz first.'},409);
 const result=await sendClaimedRideSms(db,'rights_card',ride.id);
 return json({sent:result==='sent',already_sent:result==='already_sent',result},result==='failed'?503:200);
});
