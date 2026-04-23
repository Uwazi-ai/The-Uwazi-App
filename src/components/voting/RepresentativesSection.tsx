import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Representative, getRepresentativesForUser } from "@/data/representatives";
import { useNavigate } from "react-router-dom";

function RepCard({ rep, index }: { rep: Representative; index: number }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const navigate = useNavigate();

  const initials = rep.name
    .split(" ")
    .filter((w) => w.length > 1)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const partyLetter =
    rep.party === "Democratic" ? "D" : rep.party === "Republican" ? "R" : rep.party === "Independent" ? "I" : null;

  const showPhoto = rep.photo_url && !imgError;

  const levelLabel =
    rep.level === "federal" ? "Federal" : rep.level === "state" ? "State" : "Local";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-card p-4 group hover:border-primary/30 transition-all"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle, hsl(var(--border)))" }}
    >
      {/* Top row: photo + info */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden">
          {showPhoto ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-muted animate-pulse rounded-xl flex items-center justify-center">
                  <span className="text-sm font-bold text-muted-foreground">{initials}</span>
                </div>
              )}
              <img
                src={rep.photo_url!}
                alt={rep.name}
                className={`w-14 h-14 rounded-xl object-cover object-top transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                loading="lazy"
              />
            </>
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: `${rep.party_color}15`,
                border: `1.5px solid ${rep.party_color}30`,
              }}
            >
              <span className="text-lg font-bold" style={{ color: rep.party_color }}>
                {initials}
              </span>
            </div>
          )}

          {/* Party badge */}
          {partyLetter && (
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold text-white"
              style={{
                background: rep.party_color,
                border: "2px solid hsl(var(--background))",
              }}
            >
              {partyLetter}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground leading-tight truncate">{rep.name}</p>
          <p className="text-xs text-muted-foreground leading-snug">{rep.title}</p>
          {rep.district && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{rep.district}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                background: `${rep.party_color}15`,
                color: rep.party_color,
                border: `1px solid ${rep.party_color}25`,
              }}
            >
              {rep.party || "Nonpartisan"}
            </span>
            <span className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded-full border border-border">
              {levelLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Contact actions */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {rep.phone && (
          <a
            href={`tel:${rep.phone}`}
            className="inline-flex items-center justify-center gap-1 h-7 px-2 text-[10px] rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Phone className="h-3 w-3" /> Call
          </a>
        )}
        {rep.contact_form_url && (
          <a
            href={rep.contact_form_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 h-7 px-2 text-[10px] rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            ✉️ Contact
          </a>
        )}
        {rep.website_url && (
          <a
            href={rep.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 h-7 px-2 text-[10px] rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" /> Website
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] px-2 gap-1 text-primary"
          onClick={() =>
            navigate(
              `/ask?q=${encodeURIComponent(`Tell me about ${rep.name}, the ${rep.title}. What are their key positions, recent votes, and how can I contact them?`)}`
            )
          }
        >
          🤖 Ask Uwazi
        </Button>
      </div>

      {/* Phone display */}
      {rep.phone && (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          📞 {rep.phone}
        </p>
      )}
    </motion.div>
  );
}

function RepsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-card p-4"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle, hsl(var(--border)))" }}
        >
          <div className="flex items-start gap-3">
            <Skeleton className="w-14 h-14 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
          <div className="flex gap-1.5 mt-3">
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface RepresentativesSectionProps {
  stateCode?: string | null;
  zipCode?: string | null;
  city?: string | null;
  loading?: boolean;
}

export default function RepresentativesSection({ stateCode, zipCode, city, loading }: RepresentativesSectionProps) {
  const reps = getRepresentativesForUser(stateCode, zipCode, city);

  if (loading) return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-2xl text-foreground">YOUR REPRESENTATIVES</h2>
      </div>
      <RepsSkeleton />
    </motion.div>
  );

  if (reps.length === 0) return null;

  // Group by level
  const federal = reps.filter((r) => r.level === "federal");
  const state = reps.filter((r) => r.level === "state");
  const local = reps.filter((r) => r.level === "local");

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-2xl text-foreground">YOUR REPRESENTATIVES</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Based on your location{zipCode ? ` (ZIP ${zipCode})` : ""}. Contact your elected officials directly.
      </p>

      {/* Federal */}
      {federal.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Federal</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {federal.map((rep, i) => (
              <RepCard key={rep.name} rep={rep} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* State */}
      {state.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">State</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.map((rep, i) => (
              <RepCard key={rep.name} rep={rep} index={federal.length + i} />
            ))}
          </div>
        </div>
      )}

      {/* Local */}
      {local.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Local</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {local.map((rep, i) => (
              <RepCard key={rep.name} rep={rep} index={federal.length + state.length + i} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
