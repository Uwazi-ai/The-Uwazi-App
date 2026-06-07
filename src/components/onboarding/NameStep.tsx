import { useState } from "react";
import { motion } from "framer-motion";
import { User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  initial?: string;
  onSubmit: (fullName: string) => void;
  loading?: boolean;
}

export default function NameStep({ initial, onSubmit, loading }: Props) {
  const [name, setName] = useState(initial || "");
  const [touched, setTouched] = useState(false);
  const valid = name.trim().length >= 2;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSubmit(name.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <User className="h-7 w-7 text-primary" strokeWidth={1.8} />
        </div>
        <h2 className="text-2xl font-bold text-foreground">What should we call you? 👋</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Your name personalizes your UWAZI experience.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Full Name <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="Jane Citizen"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="rounded-xl bg-background border-border focus-visible:ring-primary text-base"
          />
          {touched && !valid && (
            <p className="text-xs text-destructive">Please enter your name</p>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full rounded-xl h-12 text-sm font-semibold gap-2">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Continue →"
          )}
        </Button>
      </form>
    </motion.div>
  );
}
