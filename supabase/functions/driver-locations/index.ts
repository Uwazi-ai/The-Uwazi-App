import { driverHandler } from '../_shared/driver-tracking-handler.ts';
Deno.serve(driverHandler('locations'));
