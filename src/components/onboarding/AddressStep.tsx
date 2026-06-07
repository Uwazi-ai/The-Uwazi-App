import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_STATES, getStateFromZip } from "@/utils/stateFromZip";

export interface AddressData {
  address_line1: string;
  address_line2: string;
  city: string;
  state_code: string;
  zip_code: string;
}

interface AddressStepProps {
  onSubmit: (data: AddressData) => Promise<void>;
  onSkip: () => void;
  loading: boolean;
  initial?: Partial<AddressData>;
}

export default function AddressStep({ onSubmit, onSkip, loading, initial }: AddressStepProps) {
  const [address1, setAddress1] = useState(initial?.address_line1 || "");
  const [address2, setAddress2] = useState(initial?.address_line2 || "");
  const [city, setCity] = useState(initial?.city || "");
  const [stateCode, setStateCode] = useState(initial?.state_code || "");
  const [zipCode, setZipCode] = useState(initial?.zip_code || "");
  const [touched, setTouched] = useState(false);

  const isZipValid = /^\d{5}$/.test(zipCode);

  // Auto-fill state from ZIP
  useEffect(() => {
    if (isZipValid) {
      setStateCode(getStateFromZip(zipCode));
    }
  }, [zipCode, isZipValid]);

  const isValid = address1.trim().length >= 5 && city.trim().length >= 2 && stateCode && isZipValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    onSubmit({
      address_line1: address1.trim(),
      address_line2: address2.trim(),
      city: city.trim(),
      state_code: stateCode,
      zip_code: zipCode.trim(),
    });
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
          <MapPin className="h-7 w-7 text-primary" strokeWidth={1.8} />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Where do you vote? 🗳️</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Your address helps us find your exact polling location and show what's on YOUR specific ballot.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative space-y-4">
        {/* Street Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Street Address <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="123 Main Street"
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
            maxLength={100}
            className="rounded-xl bg-background border-border focus-visible:ring-primary text-base"
          />
          {touched && address1.trim().length < 5 && (
            <p className="text-xs text-destructive">Street address is required (min 5 characters)</p>
          )}
        </div>

        {/* Apt/Suite */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Apt / Suite (optional)</label>
          <Input
            placeholder="Apt 4B, Suite 200, Unit 3..."
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
            maxLength={50}
            className="rounded-xl bg-background border-border focus-visible:ring-primary text-base"
          />
        </div>

        {/* City + State row */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_40%] gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              City <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Kansas City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={50}
              className="rounded-xl bg-background border-border focus-visible:ring-primary text-base"
            />
            {touched && city.trim().length < 2 && (
              <p className="text-xs text-destructive">City is required</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              State <span className="text-destructive">*</span>
            </label>
            <Select value={stateCode} onValueChange={setStateCode}>
              <SelectTrigger className="rounded-xl bg-background border-border text-base">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {US_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ZIP */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            ZIP Code <span className="text-destructive">*</span>
          </label>
          <div className="relative md:w-[40%]">
            <Input
              placeholder="e.g. 64139"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              maxLength={5}
              className={`rounded-xl bg-background pr-10 text-base transition-colors ${
                touched && !isZipValid
                  ? "border-destructive focus-visible:ring-destructive"
                  : isZipValid
                  ? "border-primary/50 focus-visible:ring-primary"
                  : "border-border focus-visible:ring-primary"
              }`}
            />
            {isZipValid && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <Check className="h-4 w-4 text-primary" />
              </motion.div>
            )}
          </div>
          {touched && !isZipValid && zipCode.length > 0 && (
            <p className="text-xs text-destructive">Please enter a valid 5-digit ZIP code</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl h-12 text-sm font-semibold gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Find My Polling Location →"
          )}
        </Button>
      </form>

    </motion.div>
  );
}
