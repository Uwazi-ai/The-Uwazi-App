import { supabase } from '@/integrations/supabase/client';
export type AutocabStatus = { status?: string; estimatedPickup?: string | null; driver?: string | null; vehicle?: string | null; position?: { lat: number; lon: number } | null; trackingLink?: string | null; error?: string | null; updatedAt?: string };
export async function autocabCall(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('autocab-book', { body });
  if (error) {
    let message = data?.error;
    try { message = message ?? (await error.context?.json())?.error; } catch { /* plain fallback */ }
    throw new Error(message ?? 'Autocab could not connect. Manual Text zTrip is still available.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
