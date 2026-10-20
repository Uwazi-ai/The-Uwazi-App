import { describe,it,expect,vi } from 'vitest';
import { riderEmailSchema } from '@/lib/riderEmail';
import { riderEmailData,validEmail,RIDER_ADDRESS_LIMIT,RIGHTS_EMAIL_LIMIT } from '../../supabase/functions/_shared/rider-email-content';
import { reportCsv } from '@/components/rides/desk/deskLib';
import { singleMessage,homeMessage,updateMessage } from '@/components/rides/desk/ztripText';
const send=vi.hoisted(()=>vi.fn());
vi.mock('../../supabase/functions/_shared/transactional-email-templates/send-email.ts',()=>({sendTemplateEmail:send}));
const boundary='../../supabase/functions/_shared/rider-emails.ts';
const {sendRiderEmail}=await import(/* @vite-ignore */ boundary);
const r={id:'ride-id',email:'myke@uwazi.ai',ride_code:'UZ-1007',ride_day:'2026-10-22',pickup_time:'11:00',status:'requested',card_token:'private-token',quiz_score:7,quiz_finished_at:'2026-10-20',needs_destination:false,destination_site_id:'place',pickup_address:'PRIVATE PICKUP',phone:'8165550171',first_name_last_initial:'Fake Z.',zip:'64106',needs:[],round_trip:true,provider:'ztrip',source:'web',site:{name:'Garrison Community Center',address:'PUBLIC PLACE'},created_at:'2026-10-20',booked_at:null,completed_at:null,ride_rating:null};
describe('Optional rider email rules',()=>{
 it('normalizes trim and lowercase and accepts omission',()=>{expect(riderEmailSchema.parse(' Myke@Uwazi.AI ')).toBe('myke@uwazi.ai');expect(riderEmailSchema.parse('')).toBe('');});
 it('rejects bad format and email longer than 254',()=>{expect(riderEmailSchema.safeParse('not-an-email').success).toBe(false);expect(validEmail('a'.repeat(250)+'@x.ai')).toBe(false);});
 it('enforces requested cap constants',()=>{expect(RIDER_ADDRESS_LIMIT).toBe(3);expect(RIGHTS_EMAIL_LIMIT).toBe(2);});
 it('confirmation uses actual requested status and Central time without private contact',()=>{const d=riderEmailData('confirmation',r,r.site);expect(d.status).toBe('We received your request.');expect(d.subject).toBe('Your free ride to vote: Thu, Oct 22, 11:00 AM');expect(d.time).toBe('11:00 AM Central');for(const secret of [r.email,r.phone,r.pickup_address,r.first_name_last_initial])expect(JSON.stringify(d)).not.toContain(secret);});
 it('booked confirmation does not invent a driver',()=>{expect(riderEmailData('confirmation',{...r,status:'booked'},r.site).status).toBe("You're booked.");});
 it('reminder has the exact tomorrow subject',()=>{expect(riderEmailData('reminder',r,r.site).subject).toBe('Reminder: your free ride is tomorrow, 11:00 AM');});
 it('rights contains saved score and reviewed takeaways only',()=>{const d=riderEmailData('rights',r,null,['Reviewed fact']);expect(d.score).toBe(7);expect(d.takeaways).toEqual(['Reviewed fact']);});
 it('CSV and zTrip formatters exclude email',()=>{const ride=r as any;for(const output of [reportCsv([ride]),singleMessage(ride),homeMessage([ride]),updateMessage(ride)])expect(output).not.toContain(r.email);});
});
function db(claim='claimed',email:string|null=r.email,status='requested') {
 const events:unknown[]=[];const saved={...r,email,status};
 const database={rpc:vi.fn(async()=>({data:claim})),from:(table:string)=>{const query:any={select:()=>query,eq:()=>query,not:()=>query,order:async()=>({data:[{takeaway:'Reviewed fact'}]}),single:async()=>({data:saved}),maybeSingle:async()=>({data:r.site}),insert:async(e:unknown)=>{events.push(e);return {error:null};}};return query;}};
 return {database,events,saved};
}
describe('Rider sending isolation',()=>{
 beforeEach(()=>{vi.stubGlobal('Deno',{env:{get:()=> 'test-only-key'}});send.mockReset();});
 it('provider failure does not alter saved ride or quiz',async()=>{send.mockRejectedValueOnce(new Error('provider error with personal content'));const x=db();expect((await sendRiderEmail(x.database as any,r.id,'rights')).status).toBe('not_sent');expect(x.saved.quiz_score).toBe(7);expect(x.saved.status).toBe('requested');expect(x.events).toEqual([{request_id:r.id,event_type:'rider_email_note',note:'email_failed'}]);});
 it('suppression is a normal privacy-safe outcome',async()=>{send.mockResolvedValueOnce({sent:false,reason:'recipient_suppressed'});const x=db();expect((await sendRiderEmail(x.database as any,r.id,'confirmation')).status).toBe('suppressed');expect(x.events[0]).toEqual({request_id:r.id,event_type:'rider_email_note',note:'email_suppressed'});});
 it('duplicate claims do not send again',async()=>{const x=db('duplicate');expect((await sendRiderEmail(x.database as any,r.id,'reminder')).status).toBe('duplicate');expect(send).not.toHaveBeenCalled();});
 it('address cap refuses a fourth send',async()=>{const x=db('address_limit');expect((await sendRiderEmail(x.database as any,r.id,'rights')).status).toBe('address_limit');expect(send).not.toHaveBeenCalled();});
 it('rights cap refuses more than two',async()=>{const x=db('rights_limit');expect((await sendRiderEmail(x.database as any,r.id,'rights')).status).toBe('rights_limit');expect(send).not.toHaveBeenCalled();});
 it('one-off rights recipient is never saved',async()=>{send.mockResolvedValueOnce({sent:true,status:'queued'});const x=db('claimed',null);await sendRiderEmail(x.database as any,r.id,'rights',crypto.randomUUID(),'myke@uwazi.ai');expect(x.saved.email).toBeNull();expect(send.mock.calls[0][1]).toBe('myke@uwazi.ai');});
 it.each(['cancelled','no_show'])('reminders skip %s',async status=>{const x=db('claimed',r.email,status);expect((await sendRiderEmail(x.database as any,r.id,'reminder')).status).toBe('skipped');expect(send).not.toHaveBeenCalled();});
});