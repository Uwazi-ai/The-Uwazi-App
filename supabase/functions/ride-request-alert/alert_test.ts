import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { template } from '../_shared/transactional-email-templates/ride-coordinator-alert.tsx';
import { rideAlertData } from '../_shared/ride-alert-content.ts';
Deno.test('rendered ride email contains seats, needs and public desk link, never contact by default', async () => {
  const data = rideAlertData({ ride_code: 'UZ-1003', ride_day: '2026-10-22', pickup_time: '11:00', needs_destination: false, needs: ['wheelchair'], round_trip: true, first_name_last_initial: 'Fake Q.', phone: '8165550121' }, 'Garrison Community Center', 2, 3, false);
  const html = await renderAsync(React.createElement(template.component, data));
  for (const required of ['2 of 3 seats', 'Wheelchair', 'Garrison Community Center', 'https://uwaziapp.uwazi.ai/rides/desk']) if (!html.includes(required)) throw new Error(`Missing required field: ${required}`);
  for (const forbidden of ['Fake Q.', '8165550121', 'card_token', '/rides/card', 'pickup_address']) if (html.includes(forbidden)) throw new Error('Email privacy rule failed');
});