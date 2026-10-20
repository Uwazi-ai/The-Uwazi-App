import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { validDriverPoint } from './driver-tracking-policy.ts';
import { checkEligibility } from './ride-eligibility.ts';
const Token=z.string().regex(/^[a-f0-9]{64}$/);
const Point=z.object({lat:z.number().finite(),lng:z.number().finite(),accuracy_m:z.number().finite(),heading:z.number().finite().nullable().optional(),speed_mps:z.number().finite().nullable().optional(),recorded_at:z.string().datetime()}).strict();
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
async function hashToken(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function driverHandler(action:string){return async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST')return reply({status:'method_not_allowed'},405);
 try{
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anon=Deno.env.get('SUPABASE_ANON_KEY');if(!url||!key||!anon)return reply({status:'unavailable'},503);
 const text=await req.text();if(new TextEncoder().encode(text).length>2048)return reply({status:'payload_too_large'},413);
 let body:unknown;try{body=JSON.parse(text);}catch{return reply({status:'invalid_request'},400);}
 const db=createClient(url,key);let actor:string|undefined;
 if(!['ping','stop'].includes(action)){
  const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return reply({status:'unauthorized'},401);
  const uc=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data,error}=await uc.auth.getClaims(auth.slice(7));if(error||!data?.claims?.sub)return reply({status:'unauthorized'},401);
  actor=data.claims.sub;const {data:allowed,error:ae}=await uc.rpc('is_ride_coordinator',{_user_id:actor});if(ae||!allowed)return reply({status:'forbidden'},403);
 }
 if(action==='create'){
  const p=z.object({label:z.string().trim().min(1).max(80).default('zTrip car')}).strict().safeParse(body);if(!p.success)return reply({status:'invalid_request'},400);
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const {data,error}=await db.rpc('create_driver_location_session',{_hash:await hashToken(token),_label:p.data.label,_actor:actor});if(error)return reply({status:'unavailable'},503);return reply({...data,link:`https://uwaziapp.uwazi.ai/drive/${token}`});
 }
 if(action==='revoke'){
  const p=z.object({session_id:z.string().uuid()}).strict().safeParse(body);if(!p.success)return reply({status:'invalid_request'},400);
  const {data,error}=await db.rpc('revoke_driver_location_session',{_id:p.data.session_id,_actor:actor});return error?reply({status:'unavailable'},503):reply({ok:!!data});
 }
 if(action==='locations'){
  const p=z.object({ride_id:z.string().uuid().optional()}).strict().safeParse(body);if(!p.success)return reply({status:'invalid_request'},400);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const {data:sessions,error}=await db.from('driver_location_sessions').select('id,label,service_date,created_at,expires_at,consented_at,last_seen_at,stopped_at,revoked_at').eq('service_date',today).order('created_at',{ascending:false}).limit(30);if(error)return reply({status:'unavailable'},503);
 const rows=await Promise.all((sessions??[]).map(async s=>{if(s.revoked_at||s.stopped_at||Date.parse(s.expires_at)<=Date.now())return {...s,trail:[],latest:null,age_seconds:null};const {data:points}=await db.from('driver_location_points').select('lat,lng,accuracy_m,heading,speed_mps,recorded_at,received_at').eq('session_id',s.id).order('received_at',{ascending:false}).limit(20);return {...s,trail:[...(points??[])].reverse(),latest:points?.[0]??null,age_seconds:s.last_seen_at?Math.max(0,Math.floor((Date.now()-Date.parse(s.last_seen_at))/1000)):null};}));
  let pickup=null,place=null;
  if(p.data.ride_id){const {data:r}=await db.from('ride_requests').select('pickup_address,zip,destination_site_id,needs_destination').eq('id',p.data.ride_id).maybeSingle();if(r){const g=await checkEligibility(r.pickup_address,r.zip);if(g.status==='eligible')pickup={lat:g.lat,lng:g.lon};if(r.destination_site_id&&!r.needs_destination){const {data:s}=await db.from('voter_guide_sites').select('id').eq('id',r.destination_site_id).eq('verification_status','verified').maybeSingle();if(s){const {data:g}=await db.from('ride_site_geo').select('lat,lon').eq('site_id',s.id).maybeSingle();if(g)place={lat:g.lat,lng:g.lon};}}}}
  return reply({sessions:rows,pickup,place});
 }
 const schema=action==='stop'?z.object({token:Token}).strict():z.object({token:Token,consent:z.boolean().default(false),point:Point.optional()}).strict();const p=schema.safeParse(body);if(!p.success)return reply({ok:false,status:'invalid_request'},400);
 const hash=await hashToken(p.data.token);const point='point' in p.data?p.data.point:undefined;
 if(point&&!validDriverPoint(point))return reply({ok:false,status:'invalid_point'},400);
 const {data,error}=action==='stop'?await db.rpc('stop_driver_location_session',{_hash:hash}):await db.rpc('driver_location_ping',{_hash:hash,_consent:'consent' in p.data?p.data.consent:false,_point:point??null});
 if(error)return reply({ok:false,status:'unavailable'},503);const status=data?.status;return reply(data,status==='too_fast'?429:data?.ok?200:status==='invalid_point'||status==='consent_required'?400:410);
 }catch{return reply({status:'unavailable'},503);}
};}
