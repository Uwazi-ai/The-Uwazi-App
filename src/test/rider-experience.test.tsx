import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent, cleanup } from '@testing-library/react';
import { countdown, rideStage, driverLabel, canShowStage, RIDE_PUBLIC_URL } from '@/lib/rideExperience';
import { demoCard, demoQuestions } from '@/components/rides/demo/fixtures';
import { useRideStageSheets } from '@/hooks/useRideStageSheets';
import { RideRating } from '@/components/rides/rider/RideRating';
import { AtPlaceChecklist } from '@/components/rides/rider/RideTrackerView';
describe('rider experience',()=>{
 beforeEach(()=>{cleanup();localStorage.clear();});
 it('uses Chicago calendar days and honest waiting copy',()=>{expect(countdown(demoCard,new Date('2026-10-26T16:00:00Z'))).toBe('Tomorrow at 11 AM');expect(countdown(demoCard,new Date('2026-10-24T16:00:00Z'))).toBe('In 3 days');expect(countdown(demoCard,new Date('2026-10-27T18:00:00Z'))).toBe('Pickup at 11 AM');});
 it('completed status normalizes one-way legacy stage to 7',()=>expect(rideStage({...demoCard,trip_stage:4,status:'completed'})).toBe(7));
 it('never celebrates cancelled requests',()=>expect(canShowStage({...demoCard,status:'cancelled'})).toBe(false));
 it('provider labels do not invent zTrip drivers',()=>{expect(driverLabel({...demoCard,provider:'iris'})).toBe('Your IRIS ride');expect(driverLabel(demoCard)).toBe('Your zTrip driver');});
 it('stage sheets appear once and skipped stages never queue',()=>{const code='UZ-TEST-A';const card={...demoCard,ride_code:code,trip_stage:2};const x=renderHook(({c})=>useRideStageSheets(c,false),{initialProps:{c:card}});expect(x.result.current.sheet).toBe('stage-2');act(()=>x.result.current.close());x.rerender({c:{...card}});expect(x.result.current.sheet).toBe(null);x.rerender({c:{...card,trip_stage:5,status:'riding'}});expect(x.result.current.sheet).toBe('stage-5');expect(localStorage.getItem(`uwazi:ride-sheet:${code}:stage-3`)).toBe(null);x.unmount();const y=renderHook(()=>useRideStageSheets(card,false));expect(y.result.current.sheet).toBe(null);});
 it('unbooked requests never get a booking sheet',()=>{const x=renderHook(()=>useRideStageSheets({...demoCard,ride_code:'UZ-TEST-B',status:'requested'},true));expect(x.result.current.sheet).toBe(null);});
 it('early voting checklist never claims polls close at 7 PM',()=>{render(<AtPlaceChecklist electionDay={false}/>);expect(screen.queryByText(/7 PM/)).toBe(null);});
 it('rating saves numbers only',async()=>{const save=vi.fn().mockResolvedValue(undefined);render(<RideRating onSave={save}/>);fireEvent.click(screen.getByRole('radio',{name:'4 stars'}));expect(save).toHaveBeenCalledWith(4);await screen.findByText('Rating saved. Thank you.');});
 it('fixture quiz includes all eight approved questions and shares only public URL',()=>{expect(demoQuestions).toHaveLength(8);expect(RIDE_PUBLIC_URL).not.toContain('UZ-');expect(RIDE_PUBLIC_URL).not.toContain('?t=');});
});
