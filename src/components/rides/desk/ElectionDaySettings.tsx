import { useState } from "react";
import { CalendarClock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { SAME_DAY_MAX, SAME_DAY_MIN } from "../../../../supabase/functions/_shared/ride-cutoff";
import type { Settings } from "./deskLib";

// Admin only. The database validates every value again.
export function ElectionDaySettings({ settings, onSettings }: { settings: Settings; onSettings: (s: Settings) => void }) {
  const [dates, setDates] = useState((settings.same_day_dates ?? []).join(", "));
  const [lead, setLead] = useState(String(settings.same_day_lead_minutes ?? 60));
  const [msg, setMsg] = useState(settings.pause_message ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const paused = settings.requests_paused === true;

  const save = async (patch: Partial<Settings>) => {
    setBusy(true); setNote("");
    const { data, error } = await supabase.from("ride_settings").update(patch).eq("id", true).select("*").single();
    if (data && !error) { onSettings(data); setNote("Election Day settings saved."); } else setNote("Not saved. Check the dates, minutes and message.");
    setBusy(false);
  };

  const saveFields = () => {
    const list = dates.split(/[\s,]+/).filter(Boolean);
    const n = Number(lead);
    if (list.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) return setNote("Use dates like 2026-11-03.");
    if (!Number.isInteger(n) || n < SAME_DAY_MIN || n > SAME_DAY_MAX) return setNote(`Minutes must be ${SAME_DAY_MIN} to ${SAME_DAY_MAX}.`);
    if (msg.trim().length < 5 || msg.trim().length > 300) return setNote("Pause message must be 5 to 300 characters.");
    save({ same_day_dates: list, same_day_lead_minutes: n, pause_message: msg.trim() });
  };

  return (
    <section aria-labelledby="election-day-heading" className="mt-6 border-y border-border py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="election-day-heading" className="flex items-center gap-2 font-heading text-xl"><CalendarClock className="h-5 w-5 text-primary" />Election Day</h2>
        <span role="status" aria-label={`New requests ${paused ? "paused" : "open"}`}
          className={`rounded-full px-3 py-1 text-sm font-bold ${paused ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
          {paused ? "PAUSED" : "OPEN"}
        </span>
      </div>
      <div className="mt-4 max-w-xl space-y-4">
        <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-border p-3">
          <div>
            <Label htmlFor="requests-paused" className="text-base font-semibold">Pause new requests</Label>
            <p className="text-sm text-muted-foreground">Stops online requests. Phone requests you log still work.</p>
          </div>
          <Switch id="requests-paused" checked={paused} disabled={busy}
            onCheckedChange={(v) => (v ? setConfirm(true) : save({ requests_paused: false }))} />
        </div>
        <div>
          <Label htmlFor="same-day-dates">Same day dates</Label>
          <Input id="same-day-dates" className="mt-1 min-h-11" value={dates} onChange={(e) => setDates(e.target.value)} placeholder="2026-11-03" />
          <p className="mt-1 text-sm text-muted-foreground">On these days riders can request up to the notice below. Other days need 24 hours.</p>
        </div>
        <div>
          <Label htmlFor="same-day-lead">Same day notice, minutes ({SAME_DAY_MIN} to {SAME_DAY_MAX})</Label>
          <Input id="same-day-lead" type="number" inputMode="numeric" min={SAME_DAY_MIN} max={SAME_DAY_MAX} className="mt-1 min-h-11" value={lead} onChange={(e) => setLead(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pause-message">Pause message</Label>
          <Textarea id="pause-message" className="mt-1" maxLength={300} value={msg} onChange={(e) => setMsg(e.target.value)} />
        </div>
        <Button variant="outline" disabled={busy} onClick={saveFields}><Save className="mr-2 h-4 w-4" />Save Election Day settings</Button>
        <p role="status" className="text-sm">{note}</p>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause new requests?</AlertDialogTitle>
            <AlertDialogDescription>Riders will not be able to request online. They will see the pause message and the ride line. Phone requests still work.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep open</AlertDialogCancel>
            <AlertDialogAction onClick={() => save({ requests_paused: true })}>Pause requests</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
