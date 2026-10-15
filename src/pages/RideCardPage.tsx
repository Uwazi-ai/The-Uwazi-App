import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useRiderExperience } from '@/hooks/useRiderExperience';
import { RideCardView } from '@/components/rides/rider/RideCardView';
import { RiderSheets } from '@/components/rides/rider/RideTrackerView';
import { RideShareSheet } from '@/components/rides/rider/RideShareSheet';
import { RidesShell } from '@/components/rides/RidesUI';
import logo from '@/assets/uwazi-ride-wordmark.png';
export default function RideCardPage() {
 const {code=''} = useParams(); const [params] = useSearchParams(); const token = params.get('t') ?? ''; const navigate=useNavigate(); const x=useRiderExperience(code,token,true);
 if (!x.card) return <RidesShell logo={logo}><h1 className="font-heading text-3xl">{x.error ? 'Ride not found' : 'Loading your ride.'}</h1>{x.error && <p className="mt-4">Open the full link from your ride text, or call (816) 379-6885.</p>}</RidesShell>;
 const track = () => navigate(`/rides/track/${code}?t=${encodeURIComponent(token)}#quiz`);
 return <><RideCardView card={x.card} onTrack={track} onCalendar={x.handlers.onCalendar} onShare={x.handlers.onShare} /><RiderSheets card={x.card} sheet={x.sheets.sheet} close={x.sheets.close} handlers={{...x.handlers,onStartQuiz:track}} busy={x.busy} message={x.message} /><RideShareSheet open={x.share} onClose={() => x.setShare(false)} completed={false} /></>;
}
