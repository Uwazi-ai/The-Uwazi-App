import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Check, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const STORAGE_KEY = "uwazi_reg_optin_status"; // "submitted" | "dismissed"
const ANON_KEY = "uwazi_anonymous_id";

function getAnonymousId(): string {
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Enter a valid email" })
  .max(255);

interface Props {
  stateCode: string | null;
  onClose: () => void;
}

export function RegistrationOptInCard({ stateCode, onClose }: Props) {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "dismissed");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const anonymous_id = getAnonymousId();
      const utm_source = searchParams.get("utm_source");
      const utm_medium = searchParams.get("utm_medium");
      const utm_campaign = searchParams.get("utm_campaign");

      const { error: insertError } = await supabase.from("civic_sessions").insert({
        anonymous_id,
        state_code: stateCode,
        registration_source: "ask_uwazi_optin",
        utm_source,
        utm_medium,
        utm_campaign,
        // store opt-in email & flag in completed_at-adjacent metadata via a follow-up call below
      });

      // Persist email + opt-in via civic_registrants (admin-readable)
      await supabase.from("civic_registrants").insert({
        email: parsed.data,
        state_code: stateCode,
        opt_in_uwazi: true,
        source: "ask_uwazi_reminder",
        registration_status: "started",
      });

      if (insertError) throw insertError;

      sessionStorage.setItem(STORAGE_KEY, "submitted");
      setSubmitted(true);
    } catch (err: any) {
      // Treat duplicate email gracefully
      if (err?.code === "23505" || /duplicate/i.test(err?.message || "")) {
        sessionStorage.setItem(STORAGE_KEY, "submitted");
        setSubmitted(true);
      } else {
        console.error("Opt-in error:", err);
        setError("Something went wrong. Try again.");
        toast.error("Could not save your reminder.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl border overflow-hidden"
      style={{
        background: "#0f0f0f",
        borderColor: "rgba(155, 211, 75, 0.25)",
      }}
    >
      <div className="p-4 sm:p-5">
        {submitted ? (
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(155, 211, 75, 0.15)" }}
            >
              <Check className="w-4 h-4" style={{ color: "#9bd34b" }} />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm font-semibold" style={{ color: "#9bd34b" }}>
                Got it.
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                We'll reach out before the 2026 deadline.
              </p>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-3 mb-3 pr-6">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(155, 211, 75, 0.15)" }}
              >
                <Bell className="w-4 h-4" style={{ color: "#9bd34b" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Want a reminder when voter registration opens in your state?
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We'll send one email — no spam, ever.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                maxLength={255}
                disabled={submitting}
                className="flex-1 px-3.5 py-2.5 rounded-lg text-sm bg-background/40 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                style={{
                  background: "#9bd34b",
                  color: "#0f0f0f",
                }}
              >
                {submitting ? "Saving…" : "Remind Me"}
              </button>
            </form>
            {error && (
              <p className="text-[11px] text-destructive mt-2">{error}</p>
            )}

            <button
              onClick={handleDismiss}
              className="mt-3 text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
            >
              No thanks
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
