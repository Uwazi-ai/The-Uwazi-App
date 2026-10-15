export type RiderCard = {
  ride_code: string; ride_day: string; pickup_time: string; round_trip: boolean;
  status: string; trip_stage: number; needs_destination: boolean; referred?: boolean;
  destination: { name: string; address: string; state?: string } | null;
  ride_line_phone: string | null; provider?: string; quiz_finished?: boolean;
  quiz_score?: number | null; ride_rating?: number | null;
};
export type RightsQuestion = { id: string; sort: number; question: string; options: string[]; correct_index: number; title: string; explanation: string; takeaway: string };
export type RiderAction = 'in_car' | 'ready_home' | 'complete_one_way';
export const RIDE_PUBLIC_URL = 'https://uwaziapp.uwazi.ai/rides';
export const RIDE_LINE = '(816) 379-6885';
export const stageTitles = ["You're booked.", 'Your driver is on the way.', 'Your driver is here.', "You're riding to the voting place.", 'You made it. Go vote.', 'Your ride home is on the way.', "You're riding home.", 'Thanks for riding.'];
export function rideStage(card: RiderCard) { return card.status === 'completed' ? 7 : Math.max(0, Math.min(7, card.trip_stage)); }
export function canShowStage(card: RiderCard) { return ['booked', 'riding', 'completed'].includes(card.status); }
export function driverLabel(card: RiderCard) { return card.provider && card.provider !== 'ztrip' ? ({ iris: 'Your IRIS ride', uber_voucher: 'Your Uber ride', other: 'Your driver' }[card.provider] ?? 'Your driver') : 'Your zTrip driver'; }
export function countdown(card: RiderCard, now = new Date()) {
 const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
 const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(now);
 const days = Math.round((Date.parse(card.ride_day + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 86400000);
 const [h, m] = card.pickup_time.split(':').map(Number);
 const time = `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
 if (days === 1) return `Tomorrow at ${time}`;
 if (days > 1) return `In ${days} days`;
 if (days === 0 && parts < card.pickup_time) return `Today at ${time}`;
 return `Pickup at ${time}`;
}
export function downloadRideCalendar(c: RiderCard) {
 const start = c.ride_day.replaceAll('-', '') + 'T' + c.pickup_time.replace(':', '') + '00';
 const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
 const text = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//UWAZI//Rides//EN','BEGIN:VEVENT',`UID:${c.ride_code}@uwazi.ai`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;TZID=America/Chicago:${start}`,'DURATION:PT1H','SUMMARY:Ride to the voting place',`LOCATION:${escape(c.destination ? c.destination.name + ', ' + c.destination.address : 'Voting place to be confirmed')}`,'DESCRIPTION:Bring a photo ID. Questions? Call ' + RIDE_LINE,'END:VEVENT','END:VCALENDAR'].join('\r\n');
 downloadBlob(new Blob([text], { type: 'text/calendar' }), c.ride_code + '.ics');
}
export function downloadBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
