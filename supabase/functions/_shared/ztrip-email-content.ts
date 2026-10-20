import { dayLabel, timeLabel } from './ride-alert-content.ts';
export type DispatchKind = 'new' | 'changed' | 'cancelled' | 'home';
export const DISPATCH_LIMIT = 30;
export const DISPATCH_TIMEOUT = 5000;
export const DISPATCH_REPLY_TO = 'myke@uwazi.ai';
export interface DispatchRide { ride_code:string; ride_day:string; pickup_time:string; first_name_last_initial:string; phone:string; pickup_address:string; zip:string; needs:string[]; needs_destination:boolean; round_trip:boolean }
export interface DispatchMeta { kind:DispatchKind; changed?:string[]; oldDay?:string|null; oldTime?:string|null }
const labels:Record<string,string>={wheelchair:'Wheelchair',walker:'Walker',service_animal:'Service animal',child_seat:'Child seat',extra_time:'Extra time',language_help:'Language help',other:'Other need'};
export function normalizeDispatchEmail(email:string) { const s=email.trim().toLowerCase(); return s.length<=254 && /^[A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s)?s:null; }
export function sampleRecipient(admin:boolean, ownEmail:string|undefined) { return admin && ownEmail?normalizeDispatchEmail(ownEmail):null; }
export function dispatchEligible(enabled:boolean, kind:DispatchKind, status:string, priorSent:boolean, changes:boolean, home:boolean, stage:number, roundTrip:boolean) {
 if(!enabled)return false;
 if(kind==='new')return ['requested','booked'].includes(status);
 if(!priorSent)return false;
 if(kind==='cancelled')return changes && status==='cancelled';
 if(kind==='changed')return changes && ['requested','booked','riding'].includes(status);
 return home && roundTrip && stage===5 && status==='riding';
}
export function dispatchData(r:DispatchRide, site:{name:string;address:string}|null, meta:DispatchMeta, otherCodes:string[]=[],capacity=3,sample=false) {
 const code=r.ride_code; const rider=r.first_name_last_initial; const day=dayLabel(r.ride_day); const time=timeLabel(r.pickup_time);
 const pickup=`${r.pickup_address}, ${r.zip}`; const place=r.needs_destination||!site?'Voting place to be confirmed by UWAZI':site.name;
 let subject=`NEW ride ${code}: ${day}, ${time} pickup`;
 if(meta.kind==='new')subject=`${r.needs_destination||!site?'NEEDS VOTING PLACE: ':''}${r.needs.includes('wheelchair')?'WHEELCHAIR: ':''}${subject}`;
 if(meta.kind==='changed')subject=`CHANGED ride ${code}: now ${day}, ${time}`;
 if(meta.kind==='cancelled')subject=`CANCELLED ride ${code}: ${dayLabel(meta.oldDay||r.ride_day)}, ${timeLabel(meta.oldTime||r.pickup_time)}`;
 if(meta.kind==='home')subject=`RIDE HOME READY ride ${code}: ${rider} is ready at ${place}, take to ${pickup}`;
 if(sample)subject=`SAMPLE: ${subject}`;
 if(meta.kind==='cancelled')return {subject,kind:meta.kind,sample,rideCode:code,rider,day:dayLabel(meta.oldDay||r.ride_day),time:`${timeLabel(meta.oldTime||r.pickup_time)} Central`};
 return {subject,kind:meta.kind,sample,rideCode:code,rider,phone:r.phone,phoneHref:`tel:${r.phone.replace(/[^+\d]/g,'')}`,pickup,day,time:`${time} Central`,place,placeAddress:r.needs_destination||!site?'':site.address,trip:r.round_trip?'Round trip':'One way',roundTrip:r.round_trip,needs:r.needs.map(x=>labels[x]).filter(Boolean).join(', ')||'None listed',seats:`${otherCodes.length+1} of ${capacity} seats`,otherCodes:otherCodes.filter(x=>/^UZ-\d+$/.test(x)&&x!==code).join(', ')||'None',changed:meta.kind==='changed'?(meta.changed||[]).filter(x=>['Pickup day','Pickup time','Pickup address','Voting place'].includes(x)).join(', '):undefined};
}
export const sampleRide:DispatchRide={ride_code:'UZ-9000',ride_day:'2026-10-22',pickup_time:'11:00',first_name_last_initial:'Sample R.',phone:'8165550100',pickup_address:'123 Sample Street, Kansas City, MO',zip:'64106',needs:[],needs_destination:false,round_trip:true};
export const samplePlace={name:'Garrison Community Center',address:'1124 E. 5th St, Kansas City, MO 64106'};
