import {describe,it,expect} from 'vitest';
import {validDriverPoint,driverSendInterval,driverState,DRIVER_MAX_ACCURACY,DRIVER_MIN_INTERVAL_SECONDS,DRIVER_STALE_SECONDS} from '../../supabase/functions/_shared/driver-tracking-policy';
import {riderEmailData} from '../../supabase/functions/_shared/rider-email-content';
describe('driver tracking rules',()=>{
 const p={lat:39.1,lng:-94.6,accuracy_m:20};
 it('accepts Kansas City coordinates',()=>expect(validDriverPoint(p)).toBe(true));
 it('rejects out of area latitude',()=>expect(validDriverPoint({...p,lat:38.59})).toBe(false));
 it('rejects out of area longitude',()=>expect(validDriverPoint({...p,lng:-95.21})).toBe(false));
 it('rejects nonfinite values',()=>expect(validDriverPoint({...p,lat:Infinity})).toBe(false));
 it('limits accepted accuracy to 500 meters',()=>expect(DRIVER_MAX_ACCURACY).toBe(500));
 it('limits ingestion to one point per five seconds',()=>expect(DRIVER_MIN_INTERVAL_SECONDS).toBe(5));
 it('sends moving points every ten seconds',()=>expect(driverSendInterval(4)).toBe(10000));
 it('sends stationary points every thirty seconds',()=>expect(driverSendInterval(0)).toBe(30000));
 it('warns after two minutes',()=>{expect(DRIVER_STALE_SECONDS).toBe(120);expect(driverState({expires_at:'2026-10-21T04:00:00Z',last_seen_at:'2026-10-20T14:00:00Z'},Date.parse('2026-10-20T14:02:01Z'))).toBe('Last seen 2 min ago');});
 it('stopped overrides sharing',()=>expect(driverState({expires_at:'2026-10-21T04:00:00Z',stopped_at:'2026-10-20T14:00:00Z'},Date.parse('2026-10-20T14:01:00Z'))).toBe('Stopped'));
 it('expired overrides sharing',()=>expect(driverState({expires_at:'2026-10-20T14:00:00Z'},Date.parse('2026-10-20T14:01:00Z'))).toBe('Expired'));
});
describe('reminder day rules',()=>{
 const r={ride_code:'UZ-FIXTURE',ride_day:'2026-10-20',pickup_time:'11:00:00',status:'requested',card_token:'fixture'};
 it('today is selected using Central day',()=>{const d=riderEmailData('reminder',r,null,[],Date.parse('2026-10-21T04:59:59Z'));expect(d.reminderWhen).toBe('today');expect(d.subject).toBe('Reminder: your free ride is today, 11:00 AM');});
 it('tomorrow is selected before Central midnight',()=>{const d=riderEmailData('reminder',{...r,ride_day:'2026-10-21'},null,[],Date.parse('2026-10-21T04:59:59Z'));expect(d.reminderWhen).toBe('tomorrow');expect(d.subject).toBe('Reminder: your free ride is tomorrow, 11:00 AM');});
});