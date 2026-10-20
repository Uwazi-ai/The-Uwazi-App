import { MailCheck } from 'lucide-react';
export function ZtripEmailed({events,rideId}:{events:{request_id:string;event_type:string;created_at:string}[];rideId:string}) {
 const event=events.filter(e=>e.request_id===rideId&&e.event_type==='ztrip_emailed').sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];
 if(!event)return null;
 const time=new Date(event.created_at).toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'});
 return <span className="inline-flex max-w-full flex-wrap items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><MailCheck className="h-4 w-4"/>zTrip emailed <time dateTime={event.created_at}>{time} Central</time></span>;
}