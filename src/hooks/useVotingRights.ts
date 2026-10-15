// Know Your Voting Rights: data and logic only. No checklist item awards points.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type VoterState = "MO" | "KS";
export const ELECTION_DATE = "2026-11-03";
export const STATE_NAMES: Record<VoterState, string> = { MO: "Missouri", KS: "Kansas" };
const STATE_KEY = "uwazi_kyvr_state";
const CHECK_KEY = `uwazi_checklist_${ELECTION_DATE}`;

/** Poll rides feature flag. Off unless VITE_POLL_RIDES_LIVE is "true". */
export const POLL_RIDES_LIVE = import.meta.env.VITE_POLL_RIDES_LIVE === "true";

const isVS = (s: unknown): s is VoterState => s === "MO" || s === "KS";

export function useVoterState() {
  const { user } = useAuth();
  const [state, setLocal] = useState<VoterState>(() => {
    const s = typeof localStorage !== "undefined" ? localStorage.getItem(STATE_KEY) : null;
    return isVS(s) ? s : "MO";
  });
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("state_code").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (isVS(data?.state_code)) setLocal(data!.state_code as VoterState); });
  }, [user]);
  const setState = useCallback((s: VoterState) => { localStorage.setItem(STATE_KEY, s); setLocal(s); }, []);
  return [state, setState] as const;
}

export type ElectionRule = { key: string; label: string; startsAt: string | null; endsAt: string | null; verified: boolean; isPast: boolean };

export function useElectionRules(state: VoterState, jurisdiction?: string | null) {
  const [rules, setRules] = useState<ElectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let off = false;
    setLoading(true);
    supabase.from("election_rules").select("*").eq("election_date", ELECTION_DATE).eq("state_code", state)
      .then(({ data }) => {
        if (off) return;
        const map = new Map<string, NonNullable<typeof data>[number]>();
        for (const r of data ?? []) {
          if (r.jurisdiction && r.jurisdiction !== jurisdiction) continue;
          const prev = map.get(r.rule_key);
          if (!prev || (r.jurisdiction && !prev.jurisdiction)) map.set(r.rule_key, r);
        }
        const now = Date.now();
        setRules([...map.values()].map((r) => {
          const end = r.ends_at ?? r.starts_at;
          return { key: r.rule_key, label: r.display_label, startsAt: r.starts_at, endsAt: r.ends_at, verified: r.verified, isPast: !!end && new Date(end).getTime() < now };
        }));
        setLoading(false);
      });
    return () => { off = true; };
  }, [state, jurisdiction]);
  const byKey = useMemo(() => Object.fromEntries(rules.map((r) => [r.key, r])) as Record<string, ElectionRule | undefined>, [rules]);
  return { rules, byKey, loading };
}

export function useEarlyVotingCountdown(state: VoterState) {
  // Kansas has no statewide start; use the Johnson County row for now.
  const { byKey } = useElectionRules(state, state === "KS" ? "Johnson County" : null);
  const start = byKey.early_voting_start?.startsAt;
  const end = byKey.early_voting_end?.endsAt;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null;
    const run = () => { if (!t) t = setInterval(() => setNow(Date.now()), 1000); };
    const stop = () => { if (t) clearInterval(t); t = null; };
    const vis = () => { if (document.hidden) stop(); else { setNow(Date.now()); run(); } };
    if (!document.hidden) run();
    document.addEventListener("visibilitychange", vis);
    return () => { stop(); document.removeEventListener("visibilitychange", vis); };
  }, []);
  const s = start ? new Date(start).getTime() : null;
  const e = end ? new Date(end).getTime() : null;
  const status: "counting" | "open" | "closed" = s && now < s ? "counting" : e && now > e ? "closed" : s ? "open" : "counting";
  const left = s && status === "counting" ? Math.max(0, s - now) : 0;
  const sec = Math.floor(left / 1000);
  return { days: Math.floor(sec / 86400), hours: Math.floor((sec % 86400) / 3600), minutes: Math.floor((sec % 3600) / 60), seconds: sec % 60, status, ready: !!s };
}

export type RightsCard = {
  id: string; card_key: string; state_code: string | null; sort_order: number; span: number; color_token: string;
  tag: string; title: string; blurb: string; detail: string; source: string; ask_uwazi_prompt: string | null;
};

export function useRightsCards(state: VoterState) {
  const [cards, setCards] = useState<RightsCard[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    supabase.from("rights_cards").select("*").eq("active", true).or(`state_code.is.null,state_code.eq.${state}`)
      .order("sort_order").then(({ data }) => { setCards((data ?? []) as RightsCard[]); setLoading(false); });
  }, [state]);
  const toggle = useCallback((key: string) => setSelectedKey((k) => (k === key ? null : key)), []);
  return { cards, loading, selectedKey, setSelectedKey, toggle };
}

/** Opens Ask UWAZI with the card prompt. The Ask page applies the normal free tier limit on send. */
export function askUwaziFromCard(card: Pick<RightsCard, "ask_uwazi_prompt" | "title">, state: VoterState, navigate?: (to: string) => void) {
  const q = `${card.ask_uwazi_prompt ?? card.title} I vote in ${STATE_NAMES[state]}.`;
  const to = `/app/ask?q=${encodeURIComponent(q)}`;
  if (navigate) navigate(to); else window.location.assign(to);
}

export const CHECKLIST_KEYS = ["reg", "place", "idc", "plan", "ballot", "ride", "work", "hot"] as const;
export type ChecklistKey = (typeof CHECKLIST_KEYS)[number];

function checklistCopy(state: VoterState, regPast: boolean): Record<ChecklistKey, { label: string; sub: string }> {
  const mo = state === "MO";
  return {
    reg: mo || regPast
      ? { label: "Confirm you are registered", sub: mo ? "Registration closed Oct 7. Check your status with the Secretary of State." : "Registration closed Oct 13. Check Kansas VoterView." }
      : { label: "Register or confirm by Oct 13", sub: "Check Kansas VoterView. Registration closes Oct 13." },
    place: { label: "Find your polling place", sub: "It may have moved. Early voting sites can differ." },
    idc: { label: "Pack your photo ID", sub: mo ? "Driver or non-driver license, passport, or military or veteran ID." : "Driver license, passport, military ID, or free state ID." },
    plan: { label: "Pick when you will vote", sub: mo ? "Early in person Oct 20 to Nov 2, or Election Day." : "Advance in person (Johnson County opens Oct 17) until noon Nov 2, by mail, or Election Day." },
    ballot: { label: "Preview your ballot", sub: "See every race and measure in the Voting Hub." },
    ride: { label: "Plan your ride", sub: "Book a free poll ride in UWAZI if you need one." },
    work: { label: "Ask for time off if needed", sub: mo ? "Up to 3 paid hours. Ask before Election Day." : "Up to 2 paid hours. Ask your employer." },
    hot: { label: "Save 866-OUR-VOTE", sub: "One tap if anything goes wrong at the polls." },
  };
}

const readLocal = (): string[] => { try { return JSON.parse(localStorage.getItem(CHECK_KEY) ?? "[]"); } catch { return []; } };

export function useVoteReadyChecklist(state: VoterState) {
  const { user } = useAuth();
  const { byKey } = useElectionRules(state);
  const [done, setDone] = useState<Set<string>>(() => new Set(readLocal()));
  const merged = useRef<string | null>(null);

  useEffect(() => {
    if (!user) { setDone(new Set(readLocal())); return; }
    (async () => {
      const local = readLocal().filter((k) => (CHECKLIST_KEYS as readonly string[]).includes(k));
      if (merged.current !== user.id && local.length) {
        await supabase.from("voter_checklist_progress").upsert(
          local.map((item_key) => ({ user_id: user.id, election_date: ELECTION_DATE, item_key })),
          { onConflict: "user_id,election_date,item_key", ignoreDuplicates: true });
        localStorage.removeItem(CHECK_KEY);
      }
      merged.current = user.id;
      const { data } = await supabase.from("voter_checklist_progress").select("item_key").eq("user_id", user.id).eq("election_date", ELECTION_DATE);
      setDone(new Set((data ?? []).map((r) => r.item_key)));
    })();
  }, [user]);

  const toggle = useCallback(async (key: ChecklistKey) => {
    const was = done.has(key);
    const next = new Set(done);
    if (was) next.delete(key); else next.add(key);
    setDone(next);
    if (!user) { localStorage.setItem(CHECK_KEY, JSON.stringify([...next])); return; }
    const q = was
      ? supabase.from("voter_checklist_progress").delete().eq("user_id", user.id).eq("election_date", ELECTION_DATE).eq("item_key", key)
      : supabase.from("voter_checklist_progress").insert({ user_id: user.id, election_date: ELECTION_DATE, item_key: key });
    const { error } = await q;
    if (error) setDone(done); // roll back
  }, [done, user]);

  const copy = checklistCopy(state, !!byKey.registration_deadline?.isPast);
  const items = CHECKLIST_KEYS.map((key) => ({ key, ...copy[key], done: done.has(key) }));
  const doneCount = items.filter((i) => i.done).length;
  return { items, doneCount, total: items.length, allDone: doneCount === items.length, toggle };
}

export function useJoinRideWaitlist() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  // Server checks the KCEB ride area. The address is never stored.
  const join = useCallback(async ({ phone, address, zip, requested_date, reason }: { phone?: string; state: VoterState; address: string; zip: string; requested_date?: string; reason?: "no_driver" | "full" }): Promise<{ ok: boolean; error?: string }> => {
    const digits = phone?.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "") ?? "";
    if (!user && !/^\d{10}$/.test(digits)) { setStatus("error"); return { ok: false, error: "Enter a 10-digit mobile number." }; }
    setStatus("saving");
    const { error } = await supabase.functions.invoke("join-ride-waitlist", { body: { phone: digits || undefined, address, zip, requested_date, reason } });
    if (error) {
      let msg = "Something went wrong. Try again.";
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") { const j = await ctx.json().catch(() => null); if (j?.error) msg = j.error; }
      setStatus("error");
      return { ok: false, error: msg };
    }
    setStatus("done");
    return { ok: true };
  }, [user]);
  return { join, status };
}
