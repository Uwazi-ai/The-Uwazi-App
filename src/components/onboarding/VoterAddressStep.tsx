import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Vote, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_STATES, getStateFromZip } from "@/utils/stateFromZip";
import { fetchVoterElections } from "@/services/voterElections";

interface VoterAddressStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function VoterAddressStep({ onComplete, onSkip }: VoterAddressStepProps) {
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [zip, setZip] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const isZipValid = /^\d{5}$/.test(zip);

  useEffect(() => {
    if (isZipValid) setStateCode(getStateFromZip(zip));
  }, [zip, isZipValid]);

  const isValid = street.trim().length >= 3 && city.trim().length >= 2 && stateCode && isZipValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    setError(null);
    setLoading(true);

    try {
      const data = await fetchVoterElections({
        street: street.trim(),
        city: city.trim(),
        state: stateCode,
        zip: zip.trim(),
      });
      const count = data?.elections?.length || 0;
      setSuccess(`Found ${count} upcoming election${count !== 1 ? "s" : ""} for ${city.trim()}, ${stateCode}`);
      setTimeout(() => onComplete(), 1200);
    } catch (err: any) {
      setError(err?.message || "We couldn't find elections for this address. You can skip for now and add it later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="relative text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Vote className="h-7 w-7 text-primary" strokeWidth={1.8} />
        </div>
        <h2 className="font-heading text-3xl font-extrabold text-foreground">Where are you registered to vote? 🗳️</h2>
        <p className="text-base text-[#888888] max-w-sm mx-auto leading-relaxed">
          We'll show your upcoming elections, registration deadlines, and ballot info — personalized to your address.
        </p>
      </div>

      {success ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-2 py-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">{success}</p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="relative space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Street Address <span className="text-destructive">*</span></label>
            <Input placeholder="123 Main St Apt 4B" value={street} onChange={(e) => setStreet(e.target.value)} maxLength={200} className="rounded-xl bg-background border-[#2a2a2a] focus-visible:ring-primary text-base" />
            {touched && street.trim().length < 3 && <p className="text-xs text-destructive">Street address is required</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">City <span className="text-destructive">*</span></label>
            <Input placeholder="Kansas City" value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} className="rounded-xl bg-background border-[#2a2a2a] focus-visible:ring-primary text-base" />
            {touched && city.trim().length < 2 && <p className="text-xs text-destructive">City is required</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">State <span className="text-destructive">*</span></label>
            <Select value={stateCode} onValueChange={setStateCode}>
              <SelectTrigger className="rounded-xl bg-background border-[#2a2a2a] text-base"><SelectValue placeholder="Select your state" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {US_STATES.map((s) => (<SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">ZIP Code <span className="text-destructive">*</span></label>
            <div className="relative w-40">
              <Input placeholder="64106" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" maxLength={5} className={`rounded-xl bg-background pr-10 text-base transition-colors ${touched && !isZipValid ? "border-destructive" : isZipValid ? "border-primary/50" : "border-[#2a2a2a]"}`} />
              {isZipValid && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="h-4 w-4 text-primary" />
                </motion.div>
              )}
            </div>
            {touched && !isZipValid && zip.length > 0 && <p className="text-xs text-destructive">Please enter a valid 5-digit ZIP code</p>}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full rounded-full h-12 text-sm font-bold bg-primary text-primary-foreground gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Looking up your elections…</> : "Find My Elections →"}
          </Button>
        </form>
      )}

      <button onClick={onSkip} className="block mx-auto text-sm text-[#555555] hover:text-foreground hover:underline transition-colors">
        Skip for now — I'll add this later →
      </button>
    </motion.div>
  );
}
