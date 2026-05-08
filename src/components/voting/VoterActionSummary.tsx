import { motion } from "framer-motion";
import { Calendar, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useVoterElections } from "@/hooks/useVoterElections";
import { useProfile } from "@/contexts/ProfileContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Compact action-oriented summary of the user's upcoming election deadlines
 * and registration/voting links from Democracy Works data.
 * Designed to sit at the top of the Take Action tab.
 */
export default function VoterActionSummary() {
  const { fullAddress } = useProfile();
  const { data, isLoading } = useVoterElections();

  if (!fullAddress?.trim() && !data) return null;
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }
  if (!data?.elections?.length) return null;

  // Take the next upcoming election
  const now = new Date();
  const upcoming = data.elections
    .filter((e) => new Date(`${e.date}T23:59:59`) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (upcoming.length === 0) return null;
  const election = upcoming[0];

  const deadlines = election.registrationDeadlines;
  const hasDeadlines = deadlines && (deadlines.online || deadlines.byMail || deadlines.inPerson);

  const formatDate = (d?: string | null) => {
    if (!d) return null;
    try {
      return format(new Date(`${d}T00:00:00`), "MMM d, yyyy");
    } catch {
      return d;
    }
  };

  const isPast = (d?: string | null) => {
    if (!d) return false;
    return new Date(d) < now;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-4"
    >
      <div>
        <p className="eyebrow text-muted-foreground mb-1">YOUR NEXT ELECTION</p>
        <h3 className="font-heading text-lg text-foreground">{election.name}</h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(election.date)}
        </p>
      </div>

      {/* Registration Deadlines */}
      {hasDeadlines && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Registration Deadlines
          </p>
          <div className="flex flex-wrap gap-2">
            {deadlines.online && (
              <DeadlineChip label="📱 Online" date={deadlines.online} passed={isPast(deadlines.online)} />
            )}
            {deadlines.byMail && (
              <DeadlineChip label="📬 By Mail" date={deadlines.byMail} passed={isPast(deadlines.byMail)} />
            )}
            {deadlines.inPerson && (
              <DeadlineChip label="🏛️ In Person" date={deadlines.inPerson} passed={isPast(deadlines.inPerson)} />
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        {election.checkRegistrationUrl && (
          <Button
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground"
            onClick={() => window.open(election.checkRegistrationUrl, "_blank")}
          >
            ✅ Check Registration <ExternalLink className="h-3 w-3" />
          </Button>
        )}
        {election.registrationUrl && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-primary/30 text-primary"
            onClick={() => window.open(election.registrationUrl, "_blank")}
          >
            Register to Vote → <ExternalLink className="h-3 w-3" />
          </Button>
        )}
        {election.pollingLocationUrl && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-border text-foreground"
            onClick={() => window.open(election.pollingLocationUrl, "_blank")}
          >
            📍 Find Polling Place <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function DeadlineChip({ label, date, passed }: { label: string; date: string; passed: boolean }) {
  const formatted = (() => {
    try {
      return format(new Date(`${date}T00:00:00`), "MMM d");
    } catch {
      return date;
    }
  })();

  return (
    <span
      className={cn(
        "text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground",
        passed && "opacity-40 line-through"
      )}
    >
      {label}: {formatted}
    </span>
  );
}
