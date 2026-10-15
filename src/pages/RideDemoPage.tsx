import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { RideCardView } from '@/components/rides/rider/RideCardView';
import { RideTrackerView, RiderSheets, type RiderHandlers } from '@/components/rides/rider/RideTrackerView';
import { RideShareSheet } from '@/components/rides/rider/RideShareSheet';
import { demoCard, demoClock, demoQuestions } from '@/components/rides/demo/fixtures';
import type { RiderCard } from '@/lib/rideExperience';
export default function RideDemoPage() {
 const {user}=useAuth(); const [allowed,setAllowed]=useState<boolean|null>(null);
 useEffect(() => { let live=true; if (!user) { setAllowed(false); return; } setAllowed(null); supabase.rpc('my_ride_demo_access').then(({data,error}) => {if(live) setAllowed(!error && data === true);}); return () => {live=false;}; },[user]);
 if (allowed === null) return <p role="status" className="p-6">Checking demo access.</p>;
 if (!allowed) return <main className="p-6"><h1 className="font-heading text-2xl">This demo is for admins.</h1><p className="mt-3">Sign in with an authorized admin account.</p></main>;
 return <AuthorizedDemo key={user?.id} />;
}
function AuthorizedDemo() {
 const {stage='confirmed'}=useParams(); const [params]=useSearchParams(); const navigate=useNavigate(); const shot=params.get('shot')==='1';
 const numeric=/^[1-7]$/.test(stage) ? Number(stage) : 0;
 const [card,setCard]=useState<RiderCard>({...demoCard,round_trip:params.get('oneway')!=='1',trip_stage:numeric,status:numeric===7?'completed':numeric>=3?'riding':'booked'});
 const [sheet,setSheet]=useState<string|null>(params.get('sheet')==='0' || ['waiting','quiz'].includes(stage) ? null : stage==='confirmed'?'booking-confirmed':stage==='quiz-finished'?'quiz-finished':`stage-${numeric}`);
 const [share,setShare]=useState(false); const [message,setMessage]=useState(''); const [view,setView]=useState(stage==='confirmed'||stage==='waiting'?'card':'tracker');
 useEffect(() => { setCard({...demoCard,round_trip:params.get('oneway')!=='1',quiz_finished:stage==='quiz-finished',trip_stage:numeric,status:numeric===7?'completed':numeric>=3?'riding':'booked'}); setView(stage==='confirmed'||stage==='waiting'?'card':'tracker'); setSheet(params.get('sheet')==='0'||['waiting','quiz'].includes(stage)?null:stage==='confirmed'?'booking-confirmed':stage==='quiz-finished'?'quiz-finished':`stage-${numeric}`); setMessage(''); },[stage,numeric,params]);
 const handlers:RiderHandlers={onAction:async action => {const next=action==='in_car'?3:action==='ready_home'?5:7; setCard(old=>({...old,trip_stage:next,status:next===7?'completed':'riding'}));setSheet(`stage-${next}`);},onFinishQuiz:async score=>{setCard(old=>({...old,quiz_score:score,quiz_finished:true}));setSheet('quiz-finished');},onText:async()=>{const result='Demo text preview. Nothing was sent.';setMessage(result);return result;},onRate:async rating=>{setCard(old=>({...old,ride_rating:rating}));},onShare:()=>setShare(true),onCalendar:()=>setMessage('Demo calendar preview. Tue Oct 27 at 11 AM.')};
 return <><div className="rider-experience">{!shot && <aside className="rider-demo-bar p-3"><p className="text-sm font-semibold">DEMO · Jordan · No real ride</p><div className="mt-2 flex flex-wrap gap-1">{['confirmed','waiting','1','2','3','quiz','quiz-finished','4','5','6','7'].map(s=><Button key={s} variant="outline" className="min-h-12" onClick={()=>navigate(`/rides/demo/${s}`)}>{s}</Button>)}</div></aside>}{view==='card'?<RideCardView card={card} now={demoClock} demo onTrack={()=>setView('tracker')} onCalendar={handlers.onCalendar} onShare={handlers.onShare}/>:<RideTrackerView card={card} questions={demoQuestions} handlers={handlers} demo message={message} onCard={()=>setView('card')}/>}<RiderSheets card={card} sheet={sheet} close={()=>setSheet(null)} handlers={handlers} message={message} demo/><RideShareSheet open={share} onClose={()=>setShare(false)} completed={card.status==='completed'} demo/></div></>;
}
