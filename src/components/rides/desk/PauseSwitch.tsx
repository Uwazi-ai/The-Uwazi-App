import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Settings } from "./deskLib";

// OPEN or PAUSED badge and the pause switch. Shared by the admin panel and the Election Day desk.
export function PauseSwitch({ settings, onSettings, idSuffix = "" }: { settings: Settings; onSettings: (s: Settings) => void; idSuffix?: string }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState("");
  const paused = settings.requests_paused === true;
  const id = `requests-paused${idSuffix}`;

  const save = async (v: boolean) => {
    setBusy(true); setErr("");
    const { data, error } = await supabase.from("ride_settings").update({ requests_paused: v }).eq("id", true).select("*").single();
    if (data && !error) onSettings(data); else setErr("Not saved. Only admins can change this.");
    setBusy(false);
  };

  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
      <div className="flex items-center gap-3">
        <span role="status" aria-label={`New requests ${paused ? "paused" : "open"}`}
          className={`rounded-full px-3 py-1 text-sm font-bold ${paused ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
          {paused ? "PAUSED" : "OPEN"}
        </span>
        <div>
          <Label htmlFor={id} className="text-base font-semibold">Pause new requests</Label>
          <p className="text-sm text-muted-foreground">Stops online requests. Phone requests you log still work.</p>
        </div>
      </div>
      <Switch id={id} checked={paused} disabled={busy} onCheckedChange={(v) => (v ? setConfirm(true) : save(false))} />
      {err && <p role="alert" className="w-full text-sm text-destructive">{err}</p>}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause new requests?</AlertDialogTitle>
            <AlertDialogDescription>Riders will not be able to request online. They will see the pause message and the ride line. Phone requests still work.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep open</AlertDialogCancel>
            <AlertDialogAction onClick={() => save(true)}>Pause requests</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
