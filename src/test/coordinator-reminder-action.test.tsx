import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EmailReminderAction } from '@/components/rides/desk/EmailReminderAction';
const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
const now = Date.parse('2026-10-20T14:45:00Z');
const ride = { id: 'one-ride', ride_day: '2026-10-21', status: 'requested', hasEmail: true };
afterEach(() => { cleanup(); invoke.mockReset(); });
describe('Reminder action delivery state', () => {
  it('submits just one ride id and confirms success', async () => {
    invoke.mockResolvedValue({ data: { status: 'sent' }, error: null });
    render(<EmailReminderAction ride={ride} now={now} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled());
    expect(invoke).toHaveBeenCalledExactlyOnceWith('coordinator-email-reminder', { body: { ride_id: 'one-ride' } });
  });
  it('does not allow repeated taps during sending', async () => {
    invoke.mockReturnValue(new Promise(() => {}));
    render(<EmailReminderAction ride={ride} now={now} />);
    fireEvent.click(screen.getByRole('button')); fireEvent.click(screen.getByRole('button'));
    expect(invoke).toHaveBeenCalledTimes(1); expect(screen.getByRole('button')).toBeDisabled();
  });
  it('does not send a reminder already confirmed by events', () => {
    render(<EmailReminderAction ride={ride} now={now} sent />);
    fireEvent.click(screen.getByRole('button')); expect(invoke).not.toHaveBeenCalled();
  });
  it.each(['address_limit', 'suppressed', 'not_sent', 'already_attempted'])('does not treat %s as a successful send', async status => {
    invoke.mockResolvedValue({ data: { status }, error: null });
    render(<EmailReminderAction ride={ride} now={now} />); fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Call the rider.'));
    expect(screen.getByRole('button')).toHaveProperty('disabled', status === 'already_attempted');
  });
});