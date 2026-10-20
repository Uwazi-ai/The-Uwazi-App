import { dayLabel, timeLabel } from './ride-alert-content.ts';
export const RIGHTS_LEGAL_NOTE = 'This is voting rights information, not legal advice.';
export const RIDER_ADDRESS_LIMIT = 3;
export const RIGHTS_EMAIL_LIMIT = 2;
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const validEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function riderEmailData(kind: 'confirmation'|'reminder'|'rights', r: {ride_code:string;ride_day:string;pickup_time:string;status:string;card_token:string;quiz_score?:number|null}, place: {name:string;address:string}|null, takeaways: string[] = []) {
 const time = timeLabel(r.pickup_time);
 return {subject: kind==='confirmation'?`Your free ride to vote: ${dayLabel(r.ride_day)}, ${time}`:kind==='reminder'?`Reminder: your free ride is tomorrow, ${time}`:'Your voting rights card',kind,rideCode:r.ride_code,day:dayLabel(r.ride_day),time:`${time} Central`,status:r.status==='booked'?"You're booked.":'We received your request.',place:place?.name??'Voting place to be confirmed',placeAddress:place?.address??'',cardUrl:`https://uwaziapp.uwazi.ai/rides/card/${r.ride_code}?t=${encodeURIComponent(r.card_token)}`,score:r.quiz_score??0,total:takeaways.length,takeaways,legalNote:RIGHTS_LEGAL_NOTE};
}