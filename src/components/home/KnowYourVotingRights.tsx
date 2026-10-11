// Know Your Voting Rights home section. UI only; data comes from src/hooks/useVotingRights.ts.
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ExternalLink, Phone, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { PollRideTeaser } from "./PollRideTeaser";
import {
  ELECTION_DATE, POLL_RIDES_LIVE, STATE_NAMES, askUwaziFromCard,
  useEarlyVotingCountdown, useElectionRules, useRightsCards, useVoteReadyChecklist, useVoterState,
  type ChecklistKey, type RightsCard, type VoterState,
} from "@/hooks/useVotingRights";

const TZ = "America/Chicago";
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ });
const daysToElection = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const today = Date.parse(`${get("year")}-${get("month")}-${get("day")}T00:00:00`);
  return Math.max(0, Math.round((Date.parse(`${ELECTION_DATE}T00:00:00`) - today) / 86400000));
};

const TONES: Record<string, { fg: string; bg: string; border: string; solid?: boolean }> = {
  coral: { fg: "#140805", bg: "#ff8a65", border: "#ff8a65", solid: true },
  sky: { fg: "#5cc8ff", bg: "#0f2230", border: "rgba(92,200,255,0.40)" },
  amber: { fg: "#f5b544", bg: "#2a2010", border: "rgba(245,181,68,0.40)" },
  violet: { fg: "#b9a6ff", bg: "#1c1730", border: "rgba(185,166,255,0.40)" },
  teal: { fg: "#34d3b4", bg: "#0e2622", border: "rgba(52,211,180,0.40)" },
  pink: { fg: "#f78fc8", bg: "#2b1424", border: "rgba(247,143,200,0.40)" },
  blue: { fg: "#7aa8ff", bg: "#121c33", border: "rgba(122,168,255,0.40)" },
  lime: { fg: "hsl(var(--primary))", bg: "#16200c", border: "rgba(155,211,75,0.40)" },
};

function CountdownCard({ state }: { state: VoterState }) {
  const { days, hours, minutes, seconds, status, ready } = useEarlyVotingCountdown(state);
  const reduce = useReducedMotion();
  if (!ready || status === "closed") return null;
  const box = "rounded-[10px] bg-[rgba(10,10,10,0.10)] px-2 py-2 text-center";
  const cells: [string, number][] = [["Days", days], ["Hrs", hours], ["Min", minutes], ["Sec", seconds]];
  return (
    <div className="rounded-[14px] bg-primary p-[18px] text-primary-foreground" role="timer" aria-live="off" data-testid="early-voting-countdown">
      <span className="sr-only" aria-live="polite">{days} days until early voting opens</span>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Early voting opens in</p>
        <span className="rounded-full bg-[rgba(10,10,10,0.12)] px-2.5 py-1 text-xs font-semibold">{state === "MO" ? "Oct 20 to Nov 2" : "Oct 17 to noon Nov 2"}</span>
      </div>
      {status === "counting" ? (
        <div className="mt-3 grid grid-cols-4 gap-2" aria-hidden="true">
          {cells.map(([label, n]) => (
            <div key={label} className={box}>
              <motion.p key={label + n} initial={reduce ? false : { opacity: 0.4 }} animate={{ opacity: 1 }} className="font-heading text-[30px] leading-none tabular-nums">{String(n).padStart(2, "0")}</motion.p>
              <p className="mt-1 text-[11px] uppercase">{label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 font-heading text-[26px] leading-tight">Early voting is open. Go today.</p>
      )}
      <p className="mt-3 text-[13px] leading-snug opacity-90">
        {state === "MO"
          ? "No excuse needed. Vote in person at your election board locations. Sites may differ from your Election Day polling place."
          : "Johnson County advance voting opens Oct 17 at any county site. Wyandotte and other counties set their own dates."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild className="min-h-11 bg-[#0a0a0a] text-white hover:bg-[#0a0a0a]/90">
          <Link to="/app/vote">Find early voting sites</Link>
        </Button>
        <Button variant="outline" className="min-h-11 border-[1.5px] border-[#0a0a0a] bg-transparent text-[#0a0a0a] hover:bg-[#0a0a0a]/10" onClick={() => toast.message("Reminders are coming soon")}>
          Remind me
        </Button>
      </div>
    </div>
  );
}

function DateRows({ state }: { state: VoterState }) {
  const { byKey } = useElectionRules(state, state === "KS" ? "Johnson County" : null);
  const rows: { label: string; date: string; past: boolean; verified: boolean }[] = [];
  const reg = byKey.registration_deadline;
  if (reg?.endsAt || reg?.startsAt) rows.push({ label: "Registration deadline", date: reg.isPast ? `Closed ${fmtDay((reg.endsAt ?? reg.startsAt)!)}` : fmtDay((reg.endsAt ?? reg.startsAt)!), past: reg.isPast, verified: reg.verified });
  const evs = byKey.early_voting_start; const eve = byKey.early_voting_end;
  if (evs?.startsAt) rows.push({ label: "Early voting in person", date: `${fmtDay(evs.startsAt)} to ${eve?.endsAt ? fmtDay(eve.endsAt) : "Nov 2"}`, past: eve?.isPast ?? false, verified: evs.verified && (eve?.verified ?? true) });
  const mail = byKey.mail_request_deadline;
  if (mail?.endsAt || mail?.startsAt) rows.push({ label: "Mail ballot request", date: mail.isPast ? `Closed ${fmtDay((mail.endsAt ?? mail.startsAt)!)}` : fmtDay((mail.endsAt ?? mail.startsAt)!), past: mail.isPast, verified: mail.verified });
  rows.push({ label: "Election Day, Nov 3", date: state === "MO" ? "6 AM to 7 PM" : "7 AM to 7 PM", past: false, verified: true });
  if (!rows.length) return null;
  const anyUnverified = rows.some((r) => !r.verified);
  return (
    <div className="mt-2 space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className={`flex items-center justify-between gap-3 rounded-[10px] bg-[rgba(0,0,0,0.28)] px-3 py-2 text-[13px] ${r.past ? "opacity-70" : ""}`}>
          <span className="text-foreground">{r.label}</span>
          <span className={r.past ? "text-muted-foreground" : ""} style={r.past ? undefined : { color: "currentColor" }}>{r.date}</span>
        </div>
      ))}
      {anyUnverified && <p className="pt-1 text-xs" style={{ color: "#f5b544" }}>Confirm with your county.</p>}
    </div>
  );
}

function RightsGrid({ state }: { state: VoterState }) {
  const { cards, loading, selectedKey, toggle } = useRightsCards(state);
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-[10px] [grid-auto-flow:dense]" aria-hidden="true">
        {[2, 1, 1, 2].map((span, i) => <div key={i} className={`${span === 2 ? "col-span-2" : ""} h-[168px] animate-pulse rounded-[14px] bg-card`} />)}
      </div>
    );
  }
  if (!cards.length) return null;
  return (
    <div className="grid grid-cols-2 gap-[10px] [grid-auto-flow:dense]" data-testid="rights-grid">
      {cards.map((card) => {
        const tone = TONES[card.color_token] ?? TONES.lime;
        const open = selectedKey === card.card_key;
        const wide = card.span === 2;
        return (
          <div key={card.card_key} className={wide || open ? "col-span-2" : ""} style={{ display: "contents" }}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => toggle(card.card_key)}
              className={`flex min-h-11 flex-col gap-2 rounded-[14px] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${wide ? "col-span-2" : "min-h-[168px]"}`}
              style={{
                backgroundColor: tone.bg,
                border: open ? `2px solid hsl(var(--foreground))` : `1px solid ${tone.border}`,
                boxShadow: open ? `0 0 0 3px ${tone.border}` : undefined,
              }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: tone.solid ? "#3a160a" : tone.fg }}>{card.tag}</span>
              <span className={`font-heading leading-tight ${wide ? "text-[22px]" : "text-[17px]"}`} style={{ color: tone.solid ? "#140805" : "hsl(var(--foreground))" }}>{card.title}</span>
              <span className="text-[13px] leading-snug" style={{ color: tone.solid ? "#3a160a" : "#c9c9cf" }}>{card.blurb}</span>
              {card.card_key === "dates" && <DateRows state={state} />}
              <span className="mt-auto pt-1 text-xs font-bold" style={{ color: tone.solid ? "#140805" : tone.fg }}>{open ? "Showing details" : "Learn more"}</span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="detail"
                  initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="col-span-2 overflow-hidden"
                >
                  <div className="rounded-[14px] bg-[#121212] p-[18px]" style={{ border: `1.5px solid ${tone.fg}` }}>
                    <p className="text-sm leading-[1.6] text-foreground">{card.detail}</p>
                    <p className="mt-3 text-xs text-muted-foreground">Source: {card.source}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button className="min-h-11" onClick={() => askUwaziFromCard(card, state, navigate)}>Ask UWAZI about this</Button>
                      <Button variant="outline" className="min-h-11" onClick={() => toggle(card.card_key)}>Close</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

const CHECK_ACTIONS: Record<ChecklistKey, (state: VoterState) => { label: string; href: string; external?: boolean; tel?: boolean } | null> = {
  reg: (s) => ({ label: "Check", href: s === "MO" ? "https://www.sos.mo.gov/elections/voterlookup" : "https://myvoteinfo.voteks.org/VoterView", external: true }),
  place: () => ({ label: "Find", href: "/app/vote" }),
  idc: () => null,
  plan: () => null,
  ballot: () => ({ label: "Open", href: "/app/vote" }),
  ride: () => (POLL_RIDES_LIVE ? { label: "Book", href: "/rides" } : null),
  work: () => null,
  hot: () => ({ label: "Call", href: "tel:18666878683", tel: true }),
};

function Checklist({ state }: { state: VoterState }) {
  const { items, doneCount, total, allDone, toggle } = useVoteReadyChecklist(state);
  const share = async () => {
    const text = "I am vote-ready for Nov 3. Make your plan in UWAZI too.";
    if (navigator.share) { try { await navigator.share({ title: "My voting plan", text, url: window.location.origin }); } catch { /* dismissed */ } }
    else { await navigator.clipboard?.writeText(`${text} ${window.location.origin}`); toast.success("Link copied. Send it to someone."); }
  };
  return (
    <section className="rounded-[14px] border border-border bg-card p-[18px]" data-testid="vote-ready-checklist">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Your plan</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-[22px] text-foreground">Vote-Ready Checklist</h3>
        <span className="text-sm font-semibold text-primary">{doneCount} of {total}</span>
      </div>
      <Progress value={total ? (doneCount / total) * 100 : 0} className="mt-3 h-2" aria-label={`${doneCount} of ${total} done`} />
      <ul className="mt-4 space-y-2">
        {items.map((item) => {
          const action = CHECK_ACTIONS[item.key]?.(state);
          return (
            <li
              key={item.key}
              className="flex items-center gap-3 rounded-[10px] p-3"
              style={item.done
                ? { backgroundColor: "rgba(155,211,75,0.06)", border: "1px solid rgba(155,211,75,0.18)" }
                : { backgroundColor: "#1a1a1a", border: "1px solid hsl(var(--border))" }}
            >
              <Checkbox
                id={`check-${item.key}`}
                checked={item.done}
                onCheckedChange={() => toggle(item.key)}
                className="h-5 w-5 shrink-0"
                aria-label={item.label}
              />
              <label htmlFor={`check-${item.key}`} className="min-w-0 flex-1 cursor-pointer">
                <span className={`block text-[15px] font-semibold ${item.done ? "text-muted-foreground" : "text-foreground"}`}>{item.label}</span>
                <span className="block text-[13px] text-muted-foreground">{item.sub}</span>
              </label>
              {action && (
                action.external || action.tel ? (
                  <a href={action.href} {...(action.external ? { target: "_blank", rel: "noreferrer" } : {})} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {action.tel ? <Phone className="h-3.5 w-3.5" /> : action.external ? <ExternalLink className="h-3.5 w-3.5" /> : null}{action.label}
                  </a>
                ) : (
                  <Button asChild variant="ghost" className="min-h-11 shrink-0 px-2 text-primary">
                    <Link to={action.href}>{action.label}</Link>
                  </Button>
                )
              )}
            </li>
          );
        })}
      </ul>
      {allDone && (
        <div className="mt-4 rounded-[10px] border border-primary/30 bg-primary/10 p-4">
          <p className="font-heading text-lg text-foreground">You are vote-ready.</p>
          <p className="mt-1 text-sm text-muted-foreground">Share your plan with one person who should vote too.</p>
          <Button className="mt-3 min-h-11" onClick={share}><Share2 className="h-4 w-4" />Share</Button>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">Rules shown are for the Nov 3, 2026 general election. Confirm details with your local election authority.</p>
    </section>
  );
}

export function KnowYourVotingRights() {
  const [state, setState] = useVoterState();
  const days = useMemo(daysToElection, []);
  return (
    <section className="mx-auto w-full max-w-md space-y-4 md:max-w-2xl" data-testid="know-your-rights" aria-labelledby="kyvr-title">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Know your rights</p>
        <h2 id="kyvr-title" className="mt-1 font-heading text-[28px] tracking-[-0.02em] text-foreground">Know Your Voting Rights</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tap a card to learn the rule, then check off your plan below.</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-full border border-border bg-card p-1" role="group" aria-label="Your state">
          {(["MO", "KS"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={state === s}
              onClick={() => setState(s)}
              className={`min-h-11 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${state === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {STATE_NAMES[s]}
            </button>
          ))}
        </div>
        <span className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary" style={{ border: "1px solid rgba(155,211,75,0.25)" }}>{days} days to Nov 3</span>
      </div>
      <CountdownCard state={state} />
      <RightsGrid state={state} />
      <PollRideTeaser state={state} />
      <Checklist state={state} />
    </section>
  );
}
