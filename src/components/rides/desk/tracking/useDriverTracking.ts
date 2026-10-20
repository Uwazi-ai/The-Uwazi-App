import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import type {DriverSession,MapPin} from './types';
export function useDriverTracking(rideId?:string){
 const [sessions,setSessions]=useState<DriverSession[]>([]),[pins,setPins]=useState<MapPin[]>([]),[error,setError]=useState<string|null>(null),[now,setNow]=useState(Date.now());
 const refresh=useCallback(async()=>{if(document.visibilityState==='hidden')return;const {data,error}=await supabase.functions.invoke('driver-locations',{body:rideId?{ride_id:rideId}:{}});if(error){setError('Driver locations are unavailable.');return;}setError(null);setSessions(data?.sessions??[]);setPins([...(data?.pickup?[{...data.pickup,label:'Pickup'}]:[]),...(data?.place?[{...data.place,label:'Voting place'}]:[])]);},[rideId]);
 useEffect(()=>{let active=true;const run=()=>{if(active)void refresh();};run();const timer=setInterval(run,10000),clock=setInterval(()=>setNow(Date.now()),1000);document.addEventListener('visibilitychange',run);return()=>{active=false;clearInterval(timer);clearInterval(clock);document.removeEventListener('visibilitychange',run);};},[refresh]);
 return {sessions,pins,error,now,refresh};
}
