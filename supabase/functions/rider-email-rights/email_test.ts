import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { confirmation,reminder,rights } from '../_shared/transactional-email-templates/rider-email.tsx';
import { riderEmailData } from '../_shared/rider-email-content.ts';
Deno.test('rider templates render private-data-free bodies',async()=>{
 const r={ride_code:'UZ-1005',ride_day:'2026-10-22',pickup_time:'11:00',status:'requested',card_token:'REDACTED-DEMO-TOKEN',quiz_score:7};
 const place={name:'Garrison Community Center',address:'1124 E. 5th St, Kansas City, MO 64106'};
 for(const [kind,template] of [['confirmation',confirmation],['reminder',reminder],['rights',rights]] as const){
  const props=riderEmailData(kind,r,place,['Bring a photo ID','No ID? Ask for a provisional ballot','Not on the list? Check again, then ask for a provisional ballot','In line at closing? Stay in line','You can bring a helper','Made a mistake? Get a new ballot','Leave campaign gear at home','Problems? Call 866-OUR-VOTE']);
  const element=React.createElement(template.component,props);
  const text=await renderAsync(element,{plainText:true});
  const html=await renderAsync(element);
  for(const denied of ['414 E 12th St','8165550171','Emailtest A.','myke@uwazi.ai'])if(text.includes(denied))throw new Error('Private rider data in body');
  if(!text.includes('(816) 379-6885'))throw new Error('Missing ride line');
  await Deno.writeTextFile(`/tmp/browser/rider-emails/${kind}.html`,html);
  await Deno.writeTextFile(`/tmp/browser/rider-emails/${kind}.txt`,text);
 }
});

Deno.test('today reminder subject and rendered body use today',async()=>{
 const r={ride_code:'UZ-FIXTURE',ride_day:'2026-10-20',pickup_time:'11:00',status:'requested',card_token:'fixture'};
 const props=riderEmailData('reminder',r,null,[],Date.parse('2026-10-20T15:00:00Z'));
 if(props.subject!=='Reminder: your free ride is today, 11:00 AM')throw new Error('Incorrect reminder day');
 const text=await renderAsync(React.createElement(reminder.component,props),{plainText:true});
 if(!text.includes('Your ride to the polls is today.')||text.includes('tomorrow'))throw new Error('Incorrect reminder body day');
});