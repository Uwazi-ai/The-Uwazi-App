import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Check, Pencil, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CivicLocationSectionProps {
  currentZip: string | null;
  currentAddress: string | null;
  onUpdate: () => void;
}

export default function CivicLocationSection({ currentZip, currentAddress, onUpdate }: CivicLocationSectionProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [streetAddress, setStreetAddress] = useState(currentAddress || "");
  const [zipCode, setZipCode] = useState(currentZip || "");
  const [zipTouched, setZipTouched] = useState(false);

  const isZipValid = /^\d{5}$/.test(zipCode);
  const showZipError = zipTouched && zipCode.length > 0 && !isZipValid;

  const handleZipChange = (val: string) => {
    const numeric = val.replace(/\D/g, "").slice(0, 5);
    setZipCode(numeric);
  };

  const handleSave = async () => {
    if (!isZipValid || !user) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          street_address: streetAddress.trim() || null,
          zip_code: zipCode.trim(),
        })
        .eq("user_id", user.id);
      toast.success("Your civic location has been updated ✓");
      setEditing(false);
      onUpdate();
    } catch {
      toast.error("Failed to update location");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setStreetAddress(currentAddress || "");
    setZipCode(currentZip || "");
    setZipTouched(false);
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1">
        Your Civic Location
      </h2>
      <div className="bg-card rounded-xl shadow-card border border-border p-5 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          We use your ZIP code to personalize your civic feed, track local legislation, and calculate your Raia Score.
        </p>

        <AnimatePresence mode="wait">
          {!editing ? (
            <motion.div
              key="display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {currentZip ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-primary/10 text-primary ring-2 ring-primary/20 shadow-[0_0_12px_hsl(var(--primary)/0.15)]">
                    📍 {currentZip}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">No ZIP code set</span>
                )}
                {currentAddress && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    · {currentAddress}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                className="gap-1.5 text-xs"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
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
                    onBlur={() => setZipTouched(true)}
                    inputMode="numeric"
                    maxLength={5}
                    className={`rounded-xl bg-background pr-10 ${
                      showZipError
                        ? "border-destructive focus-visible:ring-destructive"
                        : isZipValid
                        ? "border-primary/50 focus-visible:ring-primary"
                        : "border-border focus-visible:ring-primary"
                    }`}
                  />
                  {isZipValid && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  )}
                </div>
                {showZipError && (
                  <p className="text-xs text-destructive">Please enter a valid 5-digit ZIP code</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSave}
                  disabled={!isZipValid || saving}
                  size="sm"
                  className="gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save Changes
                </Button>
                <button
                  onClick={handleCancel}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Raia Score placeholder */}
        <div className="pt-2 border-t border-border">
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Your Raia Score for <span className="font-semibold text-foreground">{currentZip || "your area"}</span> will appear here once calculated.
            </p>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-primary/20 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
