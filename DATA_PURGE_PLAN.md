# Ride data purge plan

## Driver sharing locations
- Driver location tables are service-only. Neither anonymous nor signed-in clients have direct table access.
- The token is returned once and only its SHA-256 hash is stored. Do not log tokens or coordinates.
- Revoking a session deletes its points immediately, in the same transaction.
- `purge-driver-location-points` runs daily at 08:23 UTC. It deletes points once the earliest stop, revoke or expiry is at least 48 hours old. Daily scheduling can add up to 24 hours of delay.
- Coordinate-free session audit rows remain. They hold no rider data.
- The purge never changes rides, ride events, waitlist rows, sequences or abuse-limit records.

## Rider contact data
- Optional rider email stays only on the ride request and belongs in the same purge scope as the rider name, mobile number and pickup address.
- No general rider-contact deletion job is activated by driver tracking. A reviewed rider-contact retention period remains required before scheduling that separate purge.