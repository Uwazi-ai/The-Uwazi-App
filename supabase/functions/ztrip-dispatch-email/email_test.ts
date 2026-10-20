import * as React from 'npm:react@18.3.1';
import {renderAsync} from 'npm:@react-email/components@0.0.22';
import {DispatchEmail} from '../_shared/transactional-email-templates/ztrip-dispatch.tsx';
import {dispatchData,sampleRide,samplePlace} from '../_shared/ztrip-email-content.ts';
Deno.test('six dispatch variants render without forbidden rider details',async()=>{
 const ride={...sampleRide,email:'FORBIDDEN-EMAIL',card_token:'FORBIDDEN-TOKEN',quiz_score:12345};
 const cases=[['new',ride,{kind:'new'}],['wheelchair',{...ride,needs:['wheelchair']},{kind:'new'}],['needs-place',{...ride,needs_destination:true},{kind:'new'}],['changed',{...ride,pickup_time:'12:30'},{kind:'changed',changed:['Pickup time']}],['cancelled',ride,{kind:'cancelled',oldDay:'2026-10-22',oldTime:'11:00'}],['home',ride,{kind:'home'}]] as const;
 await Deno.mkdir('/tmp/browser/ztrip-dispatch/rendered',{recursive:true});
 const report=[];
 for(const [name,r,meta]of cases){
  const p=dispatchData({...r,needs:[...r.needs]},samplePlace,{...meta,...('changed'in meta?{changed:[...meta.changed]}:{})},['UZ-9001'],3);
  const text=await renderAsync(React.createElement(DispatchEmail,p),{plainText:true});
  for(const forbidden of ['FORBIDDEN','12345','Other Rider','8165559999','/rides/card/'])if(text.includes(forbidden)||p.subject.includes(forbidden))throw Error('Forbidden dispatch content');
  if(name==='cancelled'&&(text.includes('8165550100')||text.includes('123 Sample Street')))throw Error('Cancellation contact excess');
  if(name==='changed'&&!text.includes('Pickup time'))throw Error('Missing change label');
  if(name==='new'&&!text.includes('2 of 3 seats'))throw Error('Wrong capacity');
  report.push({variant:name,subject:p.subject,body:text});
  await Deno.writeTextFile(`/tmp/browser/ztrip-dispatch/rendered/${name}.html`,await renderAsync(React.createElement(DispatchEmail,p)));
 }
 await Deno.writeTextFile('/tmp/browser/ztrip-dispatch/rendered/report.json',JSON.stringify(report,null,2));
});
