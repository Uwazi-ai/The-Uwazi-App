import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LocationStepProps {
  onSubmit: (data: { street_address: string; zip_code: string }) => Promise<void>;
  onSkip: () => void;
  loading: boolean;
}

export default function LocationStep({ onSubmit, onSkip, loading }: LocationStepProps) {
  const [streetAddress, setStreetAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [zipTouched, setZipTouched] = useState(false);
  const [zipFocused, setZipFocused] = useState(false);

  const isZipValid = /^\d{5}$/.test(zipCode);
  const showZipError = zipTouched && !zipFocused && zipCode.length > 0 && !isZipValid;
  const showSearching = isZipValid && zipFocused;

  const handleZipChange = (val: string) => {
    const numeric = val.replace(/\D/g, "").slice(0, 5);
    setZipCode(numeric);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isZipValid) return;
    onSubmit({
      street_address: streetAddress.trim(),
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
      {/* Civic grid background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="civic-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#civic-grid)" />
        </svg>
      </div>

      <div className="relative text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <MapPin className="h-7 w-7 text-primary" strokeWidth={1.8} />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Let's find your civic home 🏡</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Your ZIP code helps us surface local elections, legislation, and civic opportunities relevant to your community.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Street Address (optional)</label>
          <Input
            placeholder="123 Main Street"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            maxLength={100}
            className="rounded-xl bg-background border-border focus-visible:ring-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            ZIP Code <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Input
              placeholder="e.g. 64108"
              value={zipCode}
              onChange={(e) => handleZipChange(e.target.value)}
              onFocus={() => setZipFocused(true)}
              onBlur={() => { setZipTouched(true); setZipFocused(false); }}
              inputMode="numeric"
              maxLength={5}
              className={`rounded-xl bg-background pr-10 transition-colors ${
                showZipError
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
          {showZipError && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">
              Please enter a valid 5-digit ZIP code
            </motion.p>
          )}
          {showSearching && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-primary/70 flex items-center gap-1.5"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Searching your community…
            </motion.p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!isZipValid || loading}
          className="w-full rounded-xl h-12 text-sm font-semibold gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Find My Civic Community →"
          )}
        </Button>
      </form>

      <button
        onClick={onSkip}
        className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip for now
      </button>
    </motion.div>
  );
}
