import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const PRECINCT_SOURCE_LINE = "Precinct from the Kansas City Election Board map";

/**
 * Street address to ward, precinct and polling place, using the Election Board map.
 * Only the precinct is saved. The address is never stored.
 */
export default function PrecinctFromAddress({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!user) return null;

  const run = async () => {
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.functions.invoke("find-my-precinct", { body: { address: address.trim(), zip } });
    setBusy(false);
    if (error || !data) return setMsg("We could not check that address. Try again.");
    if (data.status !== "matched") return setMsg(data.message);
    qc.invalidateQueries({ queryKey: ["my-ballot-profile"] });
    qc.invalidateQueries({ queryKey: ["my-ballot-contests"] });
    qc.invalidateQueries({ queryKey: ["my-ballot-districts"] });
    qc.invalidateQueries({ queryKey: ["voter-guide"] });
    setMsg(data.polling_place ? null : `Ward ${data.ward}, Precinct ${data.precinct}. We do not have a polling place for it yet.`);
    onDone?.();
  };

  const ok = address.trim().length >= 5 && /^\d{5}$/.test(zip);
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Live in Kansas City, in Jackson County? Enter your street address. We will find your ward, precinct and polling place.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Street address" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl" autoComplete="street-address" />
        <Input placeholder="ZIP" inputMode="numeric" maxLength={5} value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))} className="rounded-xl sm:w-28" autoComplete="postal-code" />
      </div>
      <Button size="sm" onClick={run} disabled={!ok || busy}>
        {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Find my polling place
      </Button>
      {msg && <p role="status" className="text-xs text-foreground">{msg}</p>}
      <p className="text-[11px] text-muted-foreground">We only save your precinct. We do not save this address.</p>
    </div>
  );
}
