import * as React from 'npm:react@18.3.1';
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22';
import type { TemplateEntry } from './registry.ts';
import { DESK_URL } from '../ride-alert-content.ts';
interface Props { subject?: string; title?: string; rideCode?: string; day?: string; time?: string; place?: string; seats?: string; accessNeeds?: string; trip?: string; reason?: string; contactName?: string; contactPhone?: string; }
const Alert = (p: Props) => <Html lang="en"><Head /><Preview>{p.subject || 'UWAZI coordinator email test'}</Preview><Body style={body}><Container style={container}>
  <Text style={brand}>UWAZI</Text><Heading>{p.title || 'Coordinator email test'}</Heading>
  {p.rideCode && <Text>Ride code: {p.rideCode}</Text>}
  {p.day && <Text>Day: {p.day}</Text>}{p.time && <Text>Pickup: {p.time}</Text>}
  {p.place && <Text>Voting place: {p.place}</Text>}{p.seats && <Text>Pickup seats: {p.seats}</Text>}
  {p.accessNeeds && <Text>Access needs: {p.accessNeeds}</Text>}{p.trip && <Text>Trip: {p.trip}</Text>}
  {p.reason && <Text>Waitlist reason: {p.reason}</Text>}
  {p.contactName && <Text>Contact: {p.contactName}</Text>}{p.contactPhone && <Text>Phone: {p.contactPhone}</Text>}
  {!p.day && <Text>This test contains no rider information.</Text>}
  <Button href={DESK_URL} style={button}>Open ride desk</Button>
</Container></Body></Html>;
const body = { backgroundColor: '#ffffff', color: '#121212', fontFamily: 'Inter, Arial, sans-serif' };
const container = { maxWidth: 560, padding: '24px', margin: '0 auto' };
const brand = { color: '#1271ad', fontWeight: 700 };
const button = { backgroundColor: '#9bd34b', color: '#080808', borderRadius: '8px', padding: '14px 20px', fontWeight: 700 };
export const template = { component: Alert, subject: (p: Props) => p.subject || 'UWAZI coordinator email test', displayName: 'Ride coordinator alert', previewData: { title: 'Coordinator email test' } } satisfies TemplateEntry;