import { describe, it, expect } from 'vitest';
import { isReferred, riderStatusLine, canShowStage } from '@/lib/rideExperience';

describe('RideKC referral on the rider card', () => {
  it('tells a referred rider that no driver is coming', () => {
    const card = { status: 'referred', pickup_time: '10:00', referred: true };
    expect(isReferred(card)).toBe(true);
    expect(canShowStage(card as never)).toBe(false);
    expect(riderStatusLine(card, (t) => t)).toContain('RideKC');
  });
  it('leaves requested rides unchanged', () => {
    expect(riderStatusLine({ status: 'requested', pickup_time: '10:00' }, (t) => t)).toBe('We got your request. A coordinator will confirm shortly.');
  });
});
