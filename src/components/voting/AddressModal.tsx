import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { US_STATES, getStateFromZip } from "@/utils/stateFromZip";
import { fetchVoterElections } from "@/services/voterElections";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export default function AddressModal({ open, onOpenChange, initialAddress }: AddressModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [street, setStreet] = useState(initialAddress?.street || "");
  const [city, setCity] = useState(initialAddress?.city || "");
  const [stateCode, setStateCode] = useState(initialAddress?.state || "");
  const [zip, setZip] = useState(initialAddress?.zip || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open && initialAddress) {
      setStreet(initialAddress.street || "");
      setCity(initialAddress.city || "");
      setStateCode(initialAddress.state || "");
      setZip(initialAddress.zip || "");
      setError(null);
      setTouched(false);
    }
  }, [open, initialAddress]);

  const isZipValid = /^\d{5}$/.test(zip);
  useEffect(() => {
    if (isZipValid) setStateCode(getStateFromZip(zip));
  }, [zip, isZipValid]);

  const isValid = street.trim().length >= 3 && city.trim().length >= 2 && stateCode && isZipValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid || !user) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchVoterElections({
        street: street.trim(),
        city: city.trim(),
        state: stateCode,
        zip: zip.trim(),
      });

      // Save voter address fields
      await (supabase.from("profiles") as any)
        .update({
          voter_address_street: street.trim(),
          voter_address_city: city.trim(),
          voter_address_state: stateCode,
          voter_address_zip: zip.trim(),
          voter_elections_data: data,
          voter_elections_cached_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      queryClient.invalidateQueries({ queryKey: ["voter-profile"] });
      toast.success("Voting address updated ✓");
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="border-b border-[#2a2a2a] pb-4 flex flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <MapPin className="h-4 w-4 text-primary" /> Your Voting Address
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6 max-w-sm mx-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Street Address *</label>
            <Input placeholder="123 Main St Apt 4B" value={street} onChange={(e) => setStreet(e.target.value)} maxLength={200} className="rounded-xl bg-background border-[#2a2a2a] focus-visible:ring-primary" />
            {touched && street.trim().length < 3 && <p className="text-xs text-destructive">Required</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">City *</label>
            <Input placeholder="Kansas City" value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} className="rounded-xl bg-background border-[#2a2a2a] focus-visible:ring-primary" />
            {touched && city.trim().length < 2 && <p className="text-xs text-destructive">Required</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">State *</label>
            <Select value={stateCode} onValueChange={setStateCode}>
              <SelectTrigger className="rounded-xl bg-background border-[#2a2a2a]"><SelectValue placeholder="Select your state" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {US_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">ZIP Code *</label>
            <div className="relative w-40">
              <Input placeholder="64106" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" maxLength={5} className={`rounded-xl bg-background pr-10 ${touched && !isZipValid ? "border-destructive" : isZipValid ? "border-primary/50" : "border-[#2a2a2a]"}`} />
              {isZipValid && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full rounded-full h-12 text-sm font-bold bg-primary text-primary-foreground gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Looking up your elections…</> : "Save & Find My Elections →"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
