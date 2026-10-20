import { describe, expect, it } from 'vitest';
import { buildBooking, safeTestLists, chicagoUtc, validateGroup, redactError, safeTrackingLink, type DispatchRider, type DispatchSettings, type BookingAddress } from '../../supabase/functions/_shared/autocab-builder';
const rider = (i: number, overrides: Partial<DispatchRider> = {}): DispatchRider => ({ id: String(i), ride_code: `UZ-100${i}`, first_name_last_initial: `Test ${String.fromCharCode(64+i)}.`, phone: `816555010${i}`, pickup_address: `${i} Test St`, zip: '64106', ride_day: '2026-10-20', pickup_time: '11:00:00', needs: [], destination_site_id: 'site', needs_destination: false, status: 'requested', provider: 'ztrip', ...overrides });
const address = (i: number): BookingAddress => ({ coordinate: { latitude: 39+i/1000, longitude: -94 }, zone: { id: 1 }, text: `Test ${i}` });
const settings: DispatchSettings = { autocab_customer_id: 7, autocab_company_id: 1, autocab_driver_id: 9, autocab_capability_map: { wheelchair: 3, walker: 4 }, autocab_live: false };
describe('Autocab outbound booking rules', () => {
  it('orders two vias with passenger indexes 1 and 2', () => {
    const b = buildBooking([rider(1),rider(2),rider(3)], [address(1),address(2),address(3)],address(4),settings);
    expect(b.vias.map(v=>v.passengerDetailsIndex)).toEqual([1,2]);
    expect(b.vias.map(v=>v.address)).toEqual([address(2),address(3)]);
    expect(b.extraPassengerDetails.map(v=>v.ourReference)).toEqual(['UZ-1002','UZ-1003']);
    expect(b.pickup.passengerDetailsIndex).toBeNull();
    expect(b.destination.passengerDetailsIndex).toBeNull();
  });
  it('uses UTC minus 5 for Oct 20 to 31',()=>{
    expect(chicagoUtc('2026-10-20','11:00')).toBe('2026-10-20T16:00:00.000Z');
    expect(chicagoUtc('2026-10-31','11:00')).toBe('2026-10-31T16:00:00.000Z');
  });
  it('uses UTC minus 6 after the Nov 1 change',()=>{
    expect(chicagoUtc('2026-11-01','11:00')).toBe('2026-11-01T17:00:00.000Z');
    expect(chicagoUtc('2026-11-02','11:00')).toBe('2026-11-02T17:00:00.000Z');
    expect(chicagoUtc('2026-11-03','11:00')).toBe('2026-11-03T17:00:00.000Z');
  });
  it('holds every TEST booking and releases only explicit LIVE',()=>{
    expect(buildBooking([rider(1)],[address(1)],address(4),settings).hold).toBe(true);
    expect(buildBooking([rider(1)],[address(1)],address(4),{...settings,autocab_live:true}).hold).toBe(false);
  });
  it('includes group references, string passenger count and requested driver',()=>{
    const b=buildBooking([rider(1),rider(2)],[address(1),address(2)],address(4),settings);
    expect(b.yourReferences).toEqual({yourReference1:'UZ-1001, UZ-1002',yourReference2:'UWAZI Poll Rides'});
    expect(b.passengers).toBe('2');
    expect(b.driverConstraints).toEqual({requestedDrivers:[9]});
    expect(b.telephoneNumber).toBe('+18165550101');
  });
  it('puts wheelchair capability first and requires only wheelchair to be mapped',()=>{
    const b=buildBooking([rider(1,{needs:['walker','wheelchair']})],[address(1)],address(4),settings);
    expect(b.capabilities).toEqual([3,4]);
    expect(()=>buildBooking([rider(1,{needs:['wheelchair']})],[address(1)],address(4),{...settings,autocab_capability_map:{}})).toThrow('Map wheelchair');
  });
  it('sends other unmapped needs in the driver note only',()=>{
    const needs=['walker','service_animal','extra_time','language_help','child_seat'];
    const b=buildBooking([rider(1,{needs})],[address(1)],address(4),{...settings,autocab_capability_map:{}});
    expect(b.capabilities).toEqual([]);
    for(const n of needs) expect(b.pickup.note).toContain(n);
  });
  it('adds the dispatch capability to every booking',()=>{
    expect(buildBooking([rider(1)],[address(1)],address(4),{...settings,autocab_base_capability_id:10}).capabilities).toEqual([10]);
    expect(buildBooking([rider(1,{needs:['wheelchair']})],[address(1)],address(4),{...settings,autocab_base_capability_id:10}).capabilities).toEqual([3,10]);
    expect(buildBooking([rider(1,{needs:['wheelchair']})],[address(1)],address(4),{...settings,autocab_base_capability_id:3}).capabilities).toEqual([3]);
    expect(()=>buildBooking([rider(1)],[address(1)],address(4),{...settings,autocab_base_capability_id:0})).toThrow('Dispatch capability');
    expect(()=>buildBooking([rider(1)],[address(1)],address(4),{...settings,autocab_base_capability_id:1.5})).toThrow('Dispatch capability');
  });
  it('returns only allowlisted test fields and never driver personal data',()=>{
    const out=safeTestLists({customerAccounts:[{customerId:9,displayName:'RPS',accountCode:'37765',accountType:'Customer',active:true,telephone:'8165550101'}],capabilities:[{id:10,name:'Military Base',shortCode:'M',colour:'red'}],drivers:[{id:17,callsign:'3004',companyId:1,active:true,forename:'Secret',mobile:'8165550101',postalAddress:{a:1},bankAccountNumber:'123'}],companies:{items:[{id:1,name:'Kansas City',address:'x'}]}});
    expect(out.drivers).toEqual([{id:17,callsign:'3004',companyId:1,active:true}]);
    expect(out.customerAccounts[0]).toEqual({customerId:9,displayName:'RPS',accountCode:'37765',accountType:'Customer',active:true});
    expect(out.capabilities[0]).toEqual({id:10,name:'Military Base',shortCode:'M'});
    expect(out.companies).toEqual([{id:1,name:'Kansas City'}]);
    expect(JSON.stringify(out)).not.toMatch(/Secret|8165550101|bank/i);
  });
  it('accepts at most three same-destination outbound riders',()=>{
    expect(()=>validateGroup([rider(1),rider(2),rider(3),rider(4)])).toThrow();
    expect(()=>validateGroup([rider(1),rider(2,{destination_site_id:'different'})])).toThrow();
    expect(()=>validateGroup([rider(1,{status:'riding'})])).toThrow();
    expect(()=>validateGroup([rider(1,{provider:'iris'})])).toThrow();
  });
  it('never serializes tokens or private links even on a source row',()=>{
    const r={...rider(1),card_token:'PRIVATE_TOKEN',riderLink:'/rides/card/secret'};
    const b=JSON.stringify(buildBooking([r],[address(1)],address(4),settings));
    expect(b).not.toContain('PRIVATE_TOKEN');expect(b).not.toContain('/rides/card');
  });
  it('redacts provider errors and allows only HTTPS tracking links',()=>{
    expect(redactError('key test-key phone +1 (816) 555-0101','test-key')).toBe('key [redacted] phone [phone removed]');
    expect(safeTrackingLink('javascript:alert(1)')).toBeNull();
    expect(safeTrackingLink('https://tracking.example.test/123')).toBe('https://tracking.example.test/123');
  });
});