import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

interface AskUwaziContext {
  zipCode: string | null;
  state: string | null;
  lessonsCompleted: number | null;
  hasVotingPlan: boolean;
  savedBills: string[];
  loading: boolean;
}

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
}

function getStateFromZip(zip: string): string | null {
  const prefix = parseInt(zip.substring(0, 3), 10);
  const map: [number, number, string][] = [
    [995, 999, "AK"], [350, 369, "AL"], [716, 729, "AR"], [850, 865, "AZ"],
    [900, 961, "CA"], [800, 816, "CO"], [60, 69, "CT"], [197, 199, "DE"],
    [200, 205, "DC"], [320, 349, "FL"], [300, 319, "GA"], [967, 968, "HI"],
    [500, 528, "IA"], [832, 838, "ID"], [600, 629, "IL"], [460, 479, "IN"],
    [660, 679, "KS"], [400, 427, "KY"], [700, 714, "LA"], [10, 27, "MA"],
    [206, 219, "MD"], [39, 49, "ME"], [480, 499, "MI"], [550, 567, "MN"],
    [630, 658, "MO"], [386, 397, "MS"], [590, 599, "MT"], [270, 289, "NC"],
    [580, 588, "ND"], [680, 693, "NE"], [30, 38, "NH"], [70, 89, "NJ"],
    [870, 884, "NM"], [889, 898, "NV"], [100, 149, "NY"], [430, 459, "OH"],
    [730, 749, "OK"], [970, 979, "OR"], [150, 196, "PA"], [28, 29, "RI"],
    [290, 299, "SC"], [570, 577, "SD"], [370, 385, "TN"], [750, 799, "TX"],
    [840, 847, "UT"], [220, 246, "VA"], [50, 59, "VT"], [980, 994, "WA"],
    [530, 549, "WI"], [247, 268, "WV"], [820, 831, "WY"],
  ];
  for (const [lo, hi, st] of map) {
    if (prefix >= lo && prefix <= hi) return st;
  }
  return null;
}

export function useAskUwaziContext() {
  const { user } = useAuth();
  const [ctx, setCtx] = useState<AskUwaziContext>({
    zipCode: null, state: null, lessonsCompleted: null,
    hasVotingPlan: false, savedBills: [], loading: true,
  });

  useEffect(() => {
    if (!user) { setCtx(prev => ({ ...prev, loading: false })); return; }

    Promise.all([
      supabase.from("profiles").select("zip_code, location").eq("user_id", user.id).maybeSingle(),
      supabase.from("civic_scores").select("lessons_completed").eq("user_id", user.id).maybeSingle(),
      supabase.from("voting_plans").select("id").eq("user_id", user.id).limit(1),
      supabase.from("saved_legislation").select("bill_title").eq("user_id", user.id).limit(10),
    ]).then(([profileRes, scoreRes, planRes, billsRes]) => {
      const zip = profileRes.data?.zip_code ?? null;
      setCtx({
        zipCode: zip,
        state: profileRes.data?.location || (zip ? getStateFromZip(zip) : null),
        lessonsCompleted: scoreRes.data?.lessons_completed ?? null,
        hasVotingPlan: (planRes.data?.length ?? 0) > 0,
        savedBills: (billsRes.data || []).map((b: any) => b.bill_title).filter(Boolean),
        loading: false,
      });
    });
  }, [user]);

  return ctx;
}

export function getSuggestedPrompts(ctx: AskUwaziContext): string[] {
  if (ctx.loading) return [];

  if (ctx.hasVotingPlan && ctx.zipCode) {
    return [
      `What's on my ballot in ${ctx.state || ctx.zipCode}?`,
      "How do I research the candidates on my ballot?",
      "Tell me about the judges on my ballot",
      ctx.savedBills.length ? `What's the latest on ${ctx.savedBills[0]}?` : "Who are my local representatives?",
    ];
  }

  if (ctx.zipCode) {
    return [
      `What elections are coming up in ${ctx.zipCode}?`,
      `Who represents me in ${ctx.zipCode}?`,
      "What local issues should I know about?",
      "How do I find my polling place?",
    ];
  }

  if ((ctx.lessonsCompleted ?? 0) < 3) {
    return [
      "What's the difference between federal and local elections?",
      "How does a bill become a law?",
      "Why do local elections matter?",
      "How do I register to vote?",
    ];
  }

  return [
    "What's on my ballot?",
    "How do I register to vote?",
    "Explain a bill in plain language",
    "Who are my local representatives?",
  ];
}

// Session persistence
export function useAskUwaziSession() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [restoredMessages, setRestoredMessages] = useState<StoredMessage[] | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Restore latest session from today on mount
  useEffect(() => {
    if (!user) { setSessionLoading(false); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    supabase
      .from("ask_uwazi_sessions")
      .select("id, messages, created_at")
      .eq("user_id", user.id)
      .gte("updated_at", today.toISOString())
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && Array.isArray(data.messages) && (data.messages as any[]).length > 0) {
          setSessionId(data.id);
          setRestoredMessages(data.messages as unknown as StoredMessage[]);
        }
        setSessionLoading(false);
      });
  }, [user]);

  const saveMessages = useCallback(async (msgs: StoredMessage[], zipCode: string | null) => {
    if (!user) return;

    if (sessionId) {
      await supabase
        .from("ask_uwazi_sessions")
        .update({ messages: msgs as unknown as Json, updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    } else {
      const { data } = await supabase
        .from("ask_uwazi_sessions")
        .insert({ user_id: user.id, messages: msgs as unknown as Json, zip_code: zipCode })
        .select("id")
        .single();
      if (data) setSessionId(data.id);
    }
  }, [user, sessionId]);

  const startNewSession = useCallback(() => {
    setSessionId(null);
    setRestoredMessages(null);
  }, []);

  return { restoredMessages, sessionLoading, saveMessages, startNewSession };
}
