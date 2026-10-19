import { useCallback, useEffect, useRef, useState } from "react";
import { clearDemoRun, completionFor, demoQueueKey, demoRequest, DemoNetworkError, loadDemoCatalog, loadDemoRun, newDemoRun, storeDemoRun, type DemoLabels } from "@/lib/compassDemo";
import { scoreAnswers } from "@/lib/compassScoring";
import { offlineCatalog, offlineEvent, offlinePersonaLabels } from "@/lib/compassOffline";

export function useCompassDemo(slug: string) {
  const [event, setEvent] = useState<{ slug: string; label: string } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "inactive" | "error">("loading");
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadDemoCatalog>> | null>(null);
  const [run, setRun] = useState(() => loadDemoRun(slug));
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const sending = useRef(false);
  const loggingAbort = useRef<AbortController | null>(null);
  const eventChecked = useRef(false);

  useEffect(() => {
    let mounted = true;
    eventChecked.current = false;
    setStatus("loading"); setRun(loadDemoRun(slug));
    demoRequest<{ slug: string; label: string }[]>("rpc/get_active_demo_event", { p_slug: slug }).then(async events => {
      if (!mounted) return;
      eventChecked.current = true;
      if (!events[0]) { clearDemoRun(slug); setStatus("inactive"); return; }
      setEvent(events[0]);
      const data = await loadDemoCatalog().catch(() => offlineCatalog);
      if (mounted) { setCatalog(data); setStatus("ready"); }
    }).catch(error => {
      if (!mounted) return;
      const fallback = offlineEvent(slug);
      if (fallback && error instanceof DemoNetworkError) { setEvent(fallback); setCatalog(offlineCatalog); setStatus("ready"); }
      else { clearDemoRun(slug); setStatus("error"); }
    });
    return () => { mounted = false; generation.current++; loggingAbort.current?.abort(); };
  }, [slug]);

  useEffect(() => { if (status === "ready") storeDemoRun(slug, run); }, [slug, run, status]);

  useEffect(() => {
    if (status !== "ready") return;
    const interval = setInterval(() => {
      if (!offlineEvent(slug) && slug === "expo-oct-19") {
        generation.current++; loggingAbort.current?.abort(); clearDemoRun(slug); setRun(newDemoRun()); setStatus("inactive"); return;
      }
      demoRequest<{ slug: string; label: string }[]>("rpc/get_active_demo_event", { p_slug: slug }).then(events => {
        eventChecked.current = true;
        if (events.length) return;
        generation.current++; loggingAbort.current?.abort(); clearDemoRun(slug);
        setRun(newDemoRun()); setStatus("inactive");
      }).catch(() => { /* transient network failure does not interrupt the quiz */ });
    }, 30000);
    return () => clearInterval(interval);
  }, [slug, status]);

  const log = useCallback(async () => {
    if (status !== "ready" || run.stage !== "result" || run.logged || sending.current) return;
    const completion = completionFor(slug, run);
    if (!completion) return;
    const current = generation.current;
    const controller = new AbortController(); loggingAbort.current = controller;
    sending.current = true;
    try {
      try { sessionStorage.setItem(demoQueueKey(slug), JSON.stringify(completion)); } catch { /* memory remains */ }
      await demoRequest("rpc/log_demo_completion", completion, controller.signal);
      if (generation.current !== current) return;
      sessionStorage.removeItem(demoQueueKey(slug));
      setRun(previous => previous.result?.id === completion.p_completion_id ? { ...previous, logged: true } : previous);
    } catch { /* quietly retry while this result is still on screen */ }
    finally { if (generation.current === current) sending.current = false; }
  }, [run, slug, status]);

  useEffect(() => {
    if (run.stage !== "result" || run.logged) return;
    void log();
    const interval = setInterval(() => void log(), 10000);
    const retry = () => void log();
    window.addEventListener("online", retry);
    return () => { clearInterval(interval); window.removeEventListener("online", retry); };
  }, [run.stage, run.logged, log]);

  const finish = async () => {
    if (!catalog || finishing) return;
    setFinishing(true); setError(null);
    const current = generation.current;
    const scores = scoreAnswers(catalog.questions, catalog.dimensions, run.answers);
    try {
      // Reuses the existing SQL persona_label verbatim. This RPC never persists.
      let labels: DemoLabels;
      try { labels = await demoRequest<DemoLabels>("rpc/evaluate_compass_demo", { p_event_slug: slug, p_scores: scores }); }
      catch (error) {
        if (!(error instanceof DemoNetworkError) || !offlineEvent(slug)) throw new Error("Offline event unavailable");
        labels = offlinePersonaLabels(scores, catalog);
      }
      if (generation.current !== current) return;
      const top = catalog.dimensions.filter(d => (scores[d.slug] ?? 0) >= 0.6).sort((a, b) => scores[b.slug] - scores[a.slug]).slice(0, 3).map(d => d.slug);
      setRun(previous => ({ ...previous, stage: "result", result: { scores, labels, top, duration: Math.min(86400, Math.max(0, Math.round((Date.now() - previous.startedAt) / 1000))), id: crypto.randomUUID() } }));
    } catch { setError("We could not finish right now. Your answers are still here."); }
    finally { if (generation.current === current) setFinishing(false); }
  };
  const nextStudent = () => {
    generation.current++; loggingAbort.current?.abort(); sending.current = false;
    clearDemoRun(slug); setRun(newDemoRun()); setError(null); setFinishing(false);
  };
  return { event, status, catalog, run, setRun, finishing, error, finish, nextStudent };
}