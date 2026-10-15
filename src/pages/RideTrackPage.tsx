import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useRiderExperience } from '@/hooks/useRiderExperience';
import { RideTrackerView, RiderSheets } from '@/components/rides/rider/RideTrackerView';
import { RideShareSheet } from '@/components/rides/rider/RideShareSheet';
import { RidesShell } from '@/components/rides/RidesUI';
import logo from '@/assets/uwazi-ride-wordmark.png';
export default function RideTrackPage() {
 const {code=''}=useParams(); const [params]=useSearchParams(); const token=params.get('t') ?? ''; const navigate=useNavigate(); const x=useRiderExperience(code,token,false);
 if (!x.card) return <RidesShell logo={logo}><h1 className="font-heading text-3xl">{x.error ? 'Ride not found' : 'Loading your ride.'}</h1>{x.error && <p className="mt-4">Open your saved ride card link, or call (816) 379-6885.</p>}</RidesShell>;
 return <><RideTrackerView card={x.card} questions={x.questions} handlers={x.handlers} onCard={() => navigate(`/rides/card/${code}?t=${encodeURIComponent(token)}`)} busy={x.busy} message={x.message} /><RiderSheets card={x.card} sheet={x.sheets.sheet} close={x.sheets.close} handlers={x.handlers} busy={x.busy} message={x.message} /><RideShareSheet open={x.share} onClose={() => x.setShare(false)} completed={x.card.status === 'completed'} /></>;
}
