import { Award, Flag, Trophy } from "lucide-react";
import type { EarnedBadge } from "@/hooks/useChallenge";
import { PersonaBadge, PERSONA_PATHS } from "@/components/compass/PersonaBadge";

const ART: Record<string, typeof Award> = { trophy: Trophy, flag: Flag };

export function BadgeRow({ badges, compact }: { badges: EarnedBadge[]; compact?: boolean }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="badge-row">
      {badges.map((b) => {
        const Icon = ART[b.art_key ?? ""] ?? Award;
        return (
          <span
            key={b.id}
            title={b.description ?? b.name}
            className={`inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 font-semibold text-foreground ${compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"}`}
          >
            {PERSONA_PATHS[b.art_key ?? ""] ? <PersonaBadge slug={b.art_key!} tone={b.art_tone} size="chip" className="h-4 w-4" label="" /> : <Icon className="h-3.5 w-3.5 text-primary" />}
            {b.name}
          </span>
        );
      })}
    </div>
  );
}
