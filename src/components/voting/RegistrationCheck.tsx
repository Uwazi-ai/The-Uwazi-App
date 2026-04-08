import { motion } from "framer-motion";
import { CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REGISTRATION_DEADLINES } from "@/utils/stateFromZip";

interface RegistrationCheckProps {
  stateCode?: string | null;
}

export default function RegistrationCheck({ stateCode }: RegistrationCheckProps) {
  const deadline = stateCode ? REGISTRATION_DEADLINES[stateCode] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-card p-6 space-y-4"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}
    >
      <h3 className="font-heading text-xl text-foreground flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-primary" />
        CHECK YOUR REGISTRATION
      </h3>
      <p className="text-sm text-muted-foreground">
        Confirm you're registered before election day. Registration deadlines vary by state.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <a href="https://www.vote.gov/register/verify/" target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button className="w-full bg-primary text-primary-foreground gap-1.5">
            Check Registration <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
        <a href="https://vote.gov" target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button variant="outline" className="w-full border-border gap-1.5">
            Register to Vote <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>

      {deadline && stateCode && (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{stateCode}</span> deadline: {deadline}
        </p>
      )}
    </motion.div>
  );
}
