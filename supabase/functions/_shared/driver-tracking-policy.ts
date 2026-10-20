export const DRIVER_MIN_INTERVAL_SECONDS = 5;
export const DRIVER_STALE_SECONDS = 120;
export const DRIVER_MAX_ACCURACY = 500;
export function validDriverPoint(p: {lat:number;lng:number;accuracy_m:number;heading?:number|null;speed_mps?:number|null}) {
 return Number.isFinite(p.lat)&&p.lat>=38.6&&p.lat<=39.5&&Number.isFinite(p.lng)&&p.lng>=-95.2&&p.lng<=-94&&Number.isFinite(p.accuracy_m)&&p.accuracy_m>=0&&p.accuracy_m<=100000&&(p.heading==null||(Number.isFinite(p.heading)&&p.heading>=0&&p.heading<360))&&(p.speed_mps==null||(Number.isFinite(p.speed_mps)&&p.speed_mps>=0&&p.speed_mps<=100));
}
export function driverSendInterval(speed:number|null) { return speed!==null&&speed>0.5?10000:30000; }
export function driverState(s:{revoked_at?:string|null;stopped_at?:string|null;expires_at:string;last_seen_at?:string|null}, now=Date.now()) {
 if(s.revoked_at)return 'Revoked';if(s.stopped_at)return 'Stopped';if(Date.parse(s.expires_at)<=now)return 'Expired';if(!s.last_seen_at)return 'Link created';const age=Math.max(0,(now-Date.parse(s.last_seen_at))/1000);return age>DRIVER_STALE_SECONDS?`Last seen ${Math.floor(age/60)} min ago`:'Sharing now';
}
