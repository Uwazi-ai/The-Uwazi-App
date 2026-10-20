import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutocabBooking } from '@/components/rides/desk/AutocabTools';
import type { Ride } from '@/components/rides/desk/deskLib';
const { call } = vi.hoisted(()=>({call:vi.fn()}));
vi.mock('@/components/rides/desk/autocabClient',()=>({autocabCall:call}));
const rides=[{id:'one',ride_code:'UZ-1001',provider:'ztrip',status:'requested',destination_site_id:'site',needs_destination:false,needs:[],pickup_time:'11:00:00',pickup_address:'Test St',phone:'8165550101'} as Ride];
describe('Autocab confirmed manual controls',()=>{
  beforeEach(()=>call.mockReset());
  it('quotes first and creates only after explicit confirmation',async()=>{
    call.mockResolvedValueOnce({quote_id:'quote',price:25,mode:'TEST',expires_at:'2099-01-01T00:00:00Z'}).mockResolvedValueOnce({booking_id:'held',hold:true});
    const changed=vi.fn();render(<AutocabBooking rides={rides} live={false} onChanged={changed}/>);
    expect(screen.getByRole('button',{name:'Send to zTrip (API)'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Get zTrip quote'}));
    await screen.findByText(/Quote: 25/);
    expect(call).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button',{name:'Send to zTrip (API)'}));
    expect(call).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button',{name:'Confirm send'}));
    await waitFor(()=>expect(call).toHaveBeenCalledWith({action:'book',ride_ids:['one'],quote_id:'quote',confirm:true}));
    await waitFor(()=>expect(changed).toHaveBeenCalledOnce());
  });
  it('does not retry an ambiguous pending booking',()=>{
    render(<AutocabBooking rides={[{...rides[0],autocab_operation_id:'pending'}]} live={false} onChanged={()=>{}}/>);
    expect(screen.getByRole('status')).toHaveTextContent('Ask zTrip before retrying');
    expect(screen.queryByRole('button',{name:'Send to zTrip (API)'})).not.toBeInTheDocument();
    expect(call).not.toHaveBeenCalled();
  });
});