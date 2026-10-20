import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Ride } from "./deskLib";
import { signature, smsHref } from "./ztripText";

const btn = "inline-flex min-h-[44px] items-center justify-center rounded-xl px-3 text-sm font-semibold disabled:opacity-40";

export function ZtripTextButton({ rides, message, phone, update = false, eventType = "ztrip_texted", onMarked }: { eventType?: string; rides: Ride[]; message: string; phone: string; update?: boolean; onMarked?: () => void }) {
  const { user } = useAuth();
  const [tapped, setTapped] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setNote("Copied."); } catch { setNote("Copy did not work."); }
    setTapped(true);
  };
  const mark = async () => {
    setBusy(true);
    const { error } = await supabase.from("ride_events").insert(rides.map((r) => ({ request_id: r.id, event_type: eventType, note: eventType === "ztrip_texted" ? signature(r) : "Ride home sent to zTrip", actor: user?.id })));
    setBusy(false);
    if (error) return setNote("That did not save. Try again.");
    setTapped(false); setNote("Marked texted.");
    onMarked?.();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <a data-ztrip-sms href={smsHref(phone, message)} onClick={() => setTapped(true)} className={`${btn} bg-[hsl(var(--rides-green))] text-[hsl(var(--rides-bg))]`}>{update ? "Update zTrip" : "Text zTrip"}</a>
      <button type="button" onClick={copy} className={`${btn} border border-[hsl(var(--rides-ink)/0.25)]`}>Copy message</button>
      {tapped && <button type="button" disabled={busy} onClick={mark} className={`${btn} border border-[hsl(var(--rides-green))]`}>Mark texted</button>}
      {note && <span role="status" className="self-center text-xs">{note}</span>}
    </div>
  );
}
