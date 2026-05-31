import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyCityData } from "@/hooks/useMyCityData";

const fmtCurrency = (v: number | null | undefined) => {
  if (v == null || isNaN(v as any)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(v));
};

const relativeTime = (date: Date | null) => {
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
};

const LEVELS = [
  { id: "city", label: "City" },
  { id: "state", label: "State" },
  { id: "federal", label: "Federal" },
] as const;

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

export function MyCityDashboard() {
  const navigate = useNavigate();
  const {
    activeData,
    activeLevel,
    setActiveLevel,
    loading,
    resolving,
    refreshing,
    error,
    dataFreshness,
    zip,
    address,
  } = useMyCityData();

  // NO_ADDRESS state
  if (error === "NO_ADDRESS") {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12 md:py-16 pb-24 md:pb-8">
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <div className="text-3xl mb-3">📍</div>
          <h2 className="font-heading text-xl text-foreground mb-2">
            Add your address to see your neighborhood
          </h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            My City uses your address to find spending data, contractors, and projects in your ZIP
            code.
          </p>
          <Button
            className="bg-primary text-primary-foreground"
            onClick={() => navigate("/app/settings#address")}
          >
            Add address →
          </Button>
        </div>
      </div>
    );
  }

  const vendors = activeData?.vendors ?? [];
  const projects = activeData?.projects ?? [];
  const flags = activeData?.flags ?? [];

  const localVendorAmt = vendors
    .filter((v: any) => v.is_local)
    .reduce((s: number, v: any) => s + (v.amount || 0), 0);
  const totalVendorAmt = vendors.reduce((s: number, v: any) => s + (v.amount || 0), 0) || 1;
  const localPct = vendors.length ? Math.round((localVendorAmt / totalVendorAmt) * 100) : null;

  const mbeAmt = vendors
    .filter((v: any) =>
      (v.certifications || []).some((c: string) => c === "MN" || c === "WO"),
    )
    .reduce((s: number, v: any) => s + (v.amount || 0), 0);
  const mbePct = vendors.length ? Math.round((mbeAmt / totalVendorAmt) * 100) : null;

  const perHousehold = activeData?.meta?.per_household ?? null;

  const isStale =
    dataFreshness && Date.now() - dataFreshness.getTime() > 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 md:p-10"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.02) 50%, transparent 100%)",
          border: "1px solid hsl(var(--primary) / 0.2)",
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4) 30%, hsl(var(--primary) / 0.4) 70%, transparent)",
          }}
        />
        <p className="eyebrow text-muted-foreground mb-2">YOUR NEIGHBORHOOD</p>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground leading-none">
          YOUR MONEY. YOUR COMMUNITY.
        </h1>
        <p className="text-sm md:text-lg text-muted-foreground mt-2">
          Every dollar invested in your ZIP{zip ? ` · ${zip}` : ""}
        </p>

        {address ? (
          <div className="inline-flex items-center gap-2 mt-4 rounded-lg bg-card border border-border px-3 py-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{address}</span>
            {zip && (
              <span className="ml-1 rounded px-1.5 py-0.5 text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                ZIP {zip}
              </span>
            )}
          </div>
        ) : null}

        {/* Level pills */}
        <div className="flex gap-2 mt-5">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveLevel(l.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors ${
                activeLevel === l.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
            onClick={() =>
              navigate(
                `/app/ask?q=${encodeURIComponent(
                  `What's happening with public spending in ZIP ${zip ?? "my area"}?`,
                )}`,
              )
            }
          >
            Ask Uwazi about your ZIP →
          </Button>
        </div>
      </motion.div>

      {/* Resolving banner */}
      {resolving && (
        <div className="bg-card rounded-xl border border-primary/30 p-4 flex items-center gap-3">
          <div className="text-2xl">📍</div>
          <div>
            <p className="text-sm font-bold text-primary font-mono">
              Finding your neighborhood…
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Geocoding your address and fetching spending data. This only happens once.
            </p>
          </div>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatTile
          label="Total invested"
          value={loading ? null : fmtCurrency(activeData?.total ?? 0)}
        />
        <StatTile
          label="Per household"
          value={loading ? null : perHousehold ? fmtCurrency(perHousehold) : "—"}
        />
        <StatTile
          label="Local vendors"
          value={loading ? null : localPct == null ? "—" : `${localPct}%`}
        />
        <StatTile
          label="Transparency flags"
          value={loading ? null : `${flags.length}`}
        />
      </div>

      {/* Projects */}
      <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
        <h3 className="font-bold text-foreground text-base sm:text-lg mb-3">
          Top projects in your ZIP
        </h3>
        {loading ? (
          <div className="space-y-3">
            <Shimmer className="h-12 w-full" />
            <Shimmer className="h-12 w-full" />
            <Shimmer className="h-12 w-full" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No project data available for this level.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {projects.slice(0, 3).map((p: any, i: number) => (
              <li key={p.id ?? i} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.vendor} · {p.category}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-primary">{fmtCurrency(p.amount)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{p.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Flags */}
      {!loading && flags.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
          <h3 className="font-bold text-foreground text-base sm:text-lg mb-3">
            Transparency flags
          </h3>
          <ul className="space-y-2">
            {flags.slice(0, 4).map((f: any, i: number) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm"
              >
                <span
                  className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                    f.severity === "red"
                      ? "bg-destructive"
                      : f.severity === "amber"
                        ? "bg-yellow-500"
                        : "bg-primary"
                  }`}
                />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Data freshness footer */}
      {!loading && (
        <div
          className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-2 ${
            isStale ? "text-yellow-600" : "text-muted-foreground"
          }`}
        >
          <span>
            Data refreshed {relativeTime(dataFreshness)}
            {activeData?.sources?.length ? ` · ${activeData.sources.join(" · ")}` : ""}
          </span>
          {refreshing && (
            <span className="inline-flex items-center gap-1 text-primary">
              <RefreshCw className="h-3 w-3 animate-spin" /> Refreshing…
            </span>
          )}
        </div>
      )}

      {/* Coming soon footnote */}
      <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
        <p className="text-xs text-muted-foreground leading-relaxed">
          City contracts, state spending, and federal awards shown above are pulled from public
          data sources. Full contractor transparency, contractor maps, and ballot-linked spending
          shipping in the next update.{" "}
          <Link to="/app/settings#address" className="text-primary hover:underline">
            Update your address
          </Link>{" "}
          to re-personalize.
        </p>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 text-center min-w-0">
      {value == null ? (
        <Shimmer className="h-7 w-16 mx-auto" />
      ) : (
        <p className="text-xl sm:text-2xl font-bold text-primary truncate">{value}</p>
      )}
      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium truncate mt-1">
        {label}
      </p>
    </div>
  );
}
