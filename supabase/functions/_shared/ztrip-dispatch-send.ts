import { dispatchEligible,dispatchData,type DispatchMeta,type DispatchRide } from './ztrip-email-content.ts';
export interface DispatchStore {
 load:()=>Promise<{ride:DispatchRide&{status:string;trip_stage:number};site:{name:string;address:string}|null;meta:DispatchMeta;settings:{ztrip_dispatch_enabled:boolean;ztrip_dispatch_email:string;ztrip_email_on_changes:boolean;ztrip_email_ride_home:boolean;seats_per_slot:number};priorSent:boolean;otherCodes:string[]}|null>;
 claim:()=>Promise<string>;
 send:(recipient:string,data:Record<string,unknown>)=>Promise<{sent:boolean}>;
 note:(sent:boolean,kind:string)=>Promise<unknown>;
}
// Claims survive uncertain provider results. No contacts or errors are logged.
export async function processDispatch(store:DispatchStore) {
 const fail=async()=>{try{await store.note(false,'');}catch{/* Saved ride is independent. */}};
 try {
 const x=await store.load(); if(!x)return {status:'skipped'};
 const s=x.settings;
 if(!dispatchEligible(s.ztrip_dispatch_enabled,x.meta.kind,x.ride.status,x.priorSent,s.ztrip_email_on_changes,s.ztrip_email_ride_home,x.ride.trip_stage,x.ride.round_trip))return {status:'disabled'};
 const claim=await store.claim(); if(claim!=='claimed'){if(claim==='limited')await fail();return {status:claim};}
 const data=dispatchData(x.ride,x.site,x.meta,x.otherCodes,s.seats_per_slot);
 const sent=await store.send(s.ztrip_dispatch_email,data);
 if(!sent.sent){await fail();return {status:'suppressed'};}
 await store.note(true,x.meta.kind);return {status:'sent'};
 }catch{await fail();return {status:'not_sent'};}
}
