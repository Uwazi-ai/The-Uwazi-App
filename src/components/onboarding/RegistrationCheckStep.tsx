import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useInAppBrowser } from "@/contexts/InAppBrowserContext";

interface Props {
  onContinue: () => void;
  loading?: boolean;
}

export default function RegistrationCheckStep({ onContinue, loading }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const { openInAppBrowser } = useInAppBrowser();

  const open = (url: string) => {
    try {
      openInAppBrowser(url);
    } catch {
      // TODO: Switch to InAppBrowser when available
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 text-center"
    >
      <div className="flex justify-center">
        <CheckCircle size={56} color="#9BD34B" strokeWidth={1.8} />
      </div>

      <div className="space-y-3">
        <h2
          className="uppercase text-white"
          style={{ fontFamily: "'Axis', 'Archivo Black', sans-serif", fontSize: 24, fontWeight: 800 }}
        >
          Check Your Voter Registration
        </h2>
        <p
          className="mx-auto"
          style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 15,
            color: "#aaa",
            maxWidth: 340,
          }}
        >
          Before you dive in, let's make sure you're registered to vote. It takes 30 seconds.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={() => open("https://www.vote.org/am-i-registered-to-vote/")}
          className="w-full rounded-lg py-3 font-semibold"
          style={{ background: "#9BD34B", color: "#080808", fontWeight: 600 }}
        >
          Check My Registration →
        </button>
        <button
          type="button"
          onClick={() => open("https://www.vote.org/register-to-vote/")}
          className="w-full rounded-lg py-3"
          style={{
            background: "transparent",
            border: "1px solid rgba(155, 211, 75, 0.3)",
            color: "#9BD34B",
            fontWeight: 600,
          }}
        >
          Register to Vote →
        </button>
      </div>

      <label
        className="mt-6 flex items-center justify-center gap-3 cursor-pointer select-none"
        style={{ marginTop: 24 }}
      >
        <Checkbox
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(!!v)}
          className="border-[#9BD34B] data-[state=checked]:bg-[#9BD34B] data-[state=checked]:text-[#080808]"
        />
        <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#fff" }}>
          I've confirmed my voter registration status
        </span>
      </label>

      <button
        type="button"
        disabled={!confirmed || loading}
        onClick={onContinue}
        className="w-full rounded-lg py-3 transition-opacity"
        style={
          confirmed && !loading
            ? { background: "#9BD34B", color: "#080808", fontWeight: 600, opacity: 1 }
            : {
                background: "#333",
                color: "#666",
                fontWeight: 600,
                opacity: 0.4,
                pointerEvents: "none",
              }
        }
      >
        {loading ? "Saving…" : "Continue →"}
      </button>

      <p
        className="text-center"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: "#555",
          marginTop: 16,
        }}
      >
        Powered by Vote.org — Partner ID 111111
      </p>
    </motion.div>
  );
}
