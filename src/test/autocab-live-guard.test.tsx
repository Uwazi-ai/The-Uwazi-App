import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutocabConnection } from '@/components/rides/desk/AutocabTools';
import { liveBlockReason, accountLabel, capabilityLabel, driverLabel, companyLabel } from '@/components/rides/desk/autocabLabels';
const { call, update } = vi.hoisted(()=>({call:vi.fn(),update:vi.fn()}));
vi.mock('@/components/rides/desk/autocabClient',()=>({autocabCall:call}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({update:(v:unknown)=>{update(v);return {eq:()=>({select:()=>({single:async()=>({data:null,error:{message:'blocked'}})})})};}})}}));
const settings:any={id:true,autocab_live:false,autocab_base_url:'https://autocab-api.azure-api.net/booking/v1',autocab_company_id:1,autocab_customer_id:null,autocab_driver_id:null,autocab_base_capability_id:null,autocab_capability_map:{},autocab_expected_account_code:'37765',autocab_verified_at:null,autocab_verified_accounts:{}};
const lists=(code:string)=>({customerAccounts:[{customerId:9,displayName:'Acct',accountCode:code,accountType:'Customer',active:true}],capabilities:[{id:10,name:'Military Base',shortCode:'M'}],drivers:[{id:17,callsign:'3004',companyId:1,active:true}],companies:[{id:1,name:'Default Company'}],verified_at:new Date().toISOString()});
const now=Date.parse('2026-10-20T04:00:00Z');
describe('Autocab LIVE guard',()=>{
  beforeEach(()=>{call.mockReset();update.mockReset();});
  it('allows LIVE only for the expected account verified in the last 10 minutes',()=>{
    const ok={customerId:9,expectedCode:'37765',verifiedAccounts:{'9':'37765'},now};
    expect(liveBlockReason({...ok,verifiedAt:new Date(now-9*60000).toISOString()})).toBeNull();
    expect(liveBlockReason({...ok,verifiedAt:new Date(now-11*60000).toISOString()})).toMatch(/10 minutes/);
    expect(liveBlockReason({...ok,verifiedAt:null})).toMatch(/10 minutes/);
    expect(liveBlockReason({...ok,verifiedAt:new Date(now).toISOString(),verifiedAccounts:{'9':'99999'}})).toMatch(/37765/);
    expect(liveBlockReason({...ok,customerId:null,verifiedAt:new Date(now).toISOString()})).toMatch(/customer/);
  });
  it('formats labels with real field names',()=>{
    expect(accountLabel({customerId:9,displayName:'RPS Election Cabs',accountCode:'37765',accountType:'Customer',active:true})).toBe('37765: RPS Election Cabs (id 9)');
    expect(capabilityLabel({id:10,name:'Military Base',shortCode:'M'})).toBe('Military Base (M), id 10');
    expect(driverLabel({id:17,callsign:'3004',companyId:1,active:true})).toBe('callsign 3004, id 17');
    expect(companyLabel({id:1,name:'Kansas City'})).toBe('company Kansas City, id 1');
  });
  it('warns when expected account is missing and keeps LIVE locked',async()=>{
    call.mockResolvedValueOnce(lists('11111'));
    render(<AutocabConnection settings={settings} onSettings={()=>{}}/>);
    fireEvent.click(screen.getByRole('button',{name:/Test connection/}));
    expect(await screen.findByText('Expected account 37765 not found in this system')).toBeInTheDocument();
    expect(screen.getByRole('option',{name:'company Default Company, id 1'})).toBeInTheDocument();
    expect(screen.getAllByRole('option',{name:'Military Base (M), id 10'}).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Customer account'),{target:{value:'9'}});
    expect(screen.getByRole('switch',{name:'Live dispatch'})).toBeDisabled();
    expect(screen.getByTestId('live-block')).toHaveTextContent('Select account 37765');
    expect(update).not.toHaveBeenCalled();
  });
  it('unlocks LIVE confirmation when the expected account is selected and fresh',async()=>{
    call.mockResolvedValueOnce(lists('37765'));
    render(<AutocabConnection settings={settings} onSettings={()=>{}}/>);
    fireEvent.click(screen.getByRole('button',{name:/Test connection/}));
    await screen.findByText(/connection test passed/);
    expect(screen.queryByText(/not found in this system/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Customer account'),{target:{value:'9'}});
    expect(screen.getByRole('switch',{name:'Live dispatch'})).not.toBeDisabled();
  });
});
