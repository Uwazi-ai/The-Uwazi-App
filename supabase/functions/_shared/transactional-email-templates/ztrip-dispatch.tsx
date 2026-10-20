import * as React from 'npm:react@18.3.1';
import { Body,Container,Head,Heading,Html,Preview,Text,Link } from 'npm:@react-email/components@0.0.22';
import type { TemplateEntry } from './registry.ts';
import { dispatchData,sampleRide,samplePlace } from '../ztrip-email-content.ts';
type Props=ReturnType<typeof dispatchData>;
export function DispatchEmail(p:Props) {return <Html lang="en"><Head/><Preview>{p.subject}</Preview><Body style={main}><Container style={container}>
<Heading style={heading}>UWAZI dispatch</Heading>
{p.sample&&<Text style={notice}>SAMPLE. Fake rider details. Do not enter this trip.</Text>}
{p.changed&&<Text><b>Changed:</b> {p.changed}</Text>}
<Text><b>Pickup:</b> {p.day}, {p.time}</Text>
<Text><b>Rider:</b> {p.rider}</Text>
{p.kind!=='cancelled'&&<>
<Text><b>Phone:</b> <Link href={p.phoneHref}>{p.phone}</Link></Text>
<Text><b>Pickup address:</b> {p.pickup}</Text>
<Text><b>Voting place:</b> {p.place}{p.placeAddress&&<><br/>{p.placeAddress}</>}</Text>
<Text><b>Trip:</b> {p.trip}{p.roundTrip&&<><br/>UWAZI will tell you when the rider is ready to go home.</>}</Text>
<Text><b>Access needs:</b> {p.needs}</Text>
<Text><b>Pickup capacity:</b> {p.seats}<br/><b>Other ride codes:</b> {p.otherCodes}</Text>
</>}
<Text><b>Ride code:</b> {p.rideCode}</Text>
{p.kind!=='cancelled'&&<><Text>Questions? Reply to this email or call <Link href="tel:+18163796885">(816) 379-6885</Link>.</Text><Text>Please add this trip to the schedule for our dedicated driver. This email has rider contact details. Please delete it after the trip.</Text></>}
</Container></Body></Html>;}
export const template={component:DispatchEmail,subject:(p:Props)=>p.subject,displayName:'zTrip dispatch',previewData:dispatchData(sampleRide,samplePlace,{kind:'new'},['UZ-9001'],3,true)} satisfies TemplateEntry;
const main={backgroundColor:'#ffffff',fontFamily:'Arial, sans-serif',color:'#181818'};
const container={padding:'24px',maxWidth:'600px'};
const heading={fontSize:'24px',borderBottom:'3px solid #9bd34b',paddingBottom:'14px'};
const notice={fontWeight:700,color:'#181818',backgroundColor:'#edf6e0',padding:'12px'};
