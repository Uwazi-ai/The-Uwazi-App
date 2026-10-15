import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { CodeToken, json, notFound, rideByToken } from '../_shared/ride-token.ts';
const Body = z.object({...CodeToken,rating:z.number().int().min(1).max(5)}).strict();
Deno.serve(async req => {
 if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST') return json({error:'Method not allowed'},405);
 const p=Body.safeParse(await req.json().catch(()=>null)); if(!p.success) return notFound();
 const url=Deno.env.get('SUPABASE_URL'); const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if(!url||!key) return json({error:'This is not available right now.'},503);
 const db=createClient(url,key); const ride=await rideByToken(db,p.data.ride_code,p.data.t,'id,status'); if(!ride) return notFound();
 if(ride.status!=='completed') return json({error:'Your ride is not complete yet.'},409);
 const {data,error}=await db.from('ride_requests').update({ride_rating:p.data.rating}).eq('id',ride.id).eq('status','completed').select('ride_rating').maybeSingle();
 if(error||!data) return json({error:'That did not save. Please try again.'},409);
 return json({ride_rating:data.ride_rating});
});
