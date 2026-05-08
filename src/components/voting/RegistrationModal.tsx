import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Lock, X } from "lucide-react";

interface RegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  stateLabel?: string;
}

const FALLBACK_CHECK = "https://verify.vote.org/?partner=111111&campaign=free-tools";
const FALLBACK_REGISTER = "https://register.vote.org/?partner=111111&campaign=free-tools";

export default function RegistrationModal({ open, onOpenChange, url, stateLabel }: RegistrationModalProps) {
  const resolvedUrl = url || FALLBACK_CHECK;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-[#2a2a2a]" style={{ background: "#111111" }}>
          <p className="text-sm font-semibold text-foreground truncate">
            {stateLabel ? `${stateLabel} Election Information` : "Election Information"}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" /> Official State Website
            </span>
            <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* iframe */}
        <div className="flex-1 min-h-0">
          <iframe
            id="registration-iframe"
            src={resolvedUrl}
            title="Voter Registration"
            className="w-full h-full border-none"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
