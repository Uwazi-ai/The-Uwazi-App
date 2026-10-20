import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AutocabStatus } from '@/components/rides/desk/autocabClient';
export function useAutocabPoll(enabled:boolean) {
  const [statuses,setStatuses]=useState<Record<string,AutocabStatus>>({});
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    if(!enabled)return;
    let stopped=false, failures=0, timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      if(document.visibilityState==='hidden'){timer=setTimeout(poll,30000);return;}
      const {data,error:e}=await supabase.functions.invoke('autocab-poll',{body:{}});
      if(stopped)return;
      if(e){failures++;let msg=data?.error;try{msg=msg??(await e.context?.json())?.error;}catch{/* fallback */}setError(msg??'Autocab status unavailable.');}
      else{failures=0;setError(null);setStatuses(data?.bookings??{});}
      timer=setTimeout(poll,Math.min(900000,30000*2**failures));
    };
    poll();return()=>{stopped=true;clearTimeout(timer);};
  },[enabled]);
  return {statuses,error};
}
