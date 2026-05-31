import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, BookmarkPlus, BookmarkCheck, Share2, RotateCcw, MapPin,
  Plus, MessageCircle, Trash2, Clock, ArrowLeft,
  Copy, Check, Vote, FileText, Landmark, CalendarDays,
  Globe, ExternalLink, AlertCircle, X, Zap, Star,
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import uwaziLogo from "@/assets/uwazi-logo.png";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useAskUwaziContext, getSuggestedPrompts, useAskUwaziSession, type ChatSession } from "@/hooks/useAskUwazi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { isToday, isYesterday, differenceInDays } from "date-fns";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { RegistrationOptInCard } from "@/components/ask-uwazi/RegistrationOptInCard";
import { AskLimitPill, AskLimitPaywall } from "@/components/ask-uwazi/AskLimitUI";

interface Source {
  title: string;
  url: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  saved?: boolean;
  sources?: Source[];
  didSearch?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-uwazi`;

const SEARCH_TRIGGERS = [
  'who is', 'candidate', 'running for', 'voting record',
  'campaign', 'donated', 'endorsed', 'stance on',
  'bill', 'hr ', 'sb ', 'hb ', 'senate bill', 'house bill',
  'passed', 'signed', 'vetoed', 'status of',
  'latest', 'recent', 'today', 'this week', 'just happened',
  'current', 'now', 'update', 'news',
  'city council', 'mayor', 'school board', 'election results',
  'won', 'lost', 'primary', 'general election',
  'tell me about', 'research', 'find out', 'look up',
  'search for', 'what happened',
];

function willLikelySearch(message: string): boolean {
  const lower = message.toLowerCase();
  return SEARCH_TRIGGERS.some(t => lower.includes(t));
}

function groupChatsByDate(chats: ChatSession[]): { label: string; chats: ChatSession[] }[] {
  const groups: Record<string, ChatSession[]> = {};
  const order: string[] = [];
  for (const chat of chats) {
    const d = new Date(chat.updatedAt);
    let label: string;
    if (isToday(d)) label = "Today";
    else if (isYesterday(d)) label = "Yesterday";
    else if (differenceInDays(new Date(), d) <= 7) label = "This Week";
    else label = "Older";
    if (!groups[label]) { groups[label] = []; order.push(label); }
    groups[label].push(chat);
  }
  return order.map((label) => ({ label, chats: groups[label] }));
}

async function streamChat({ messages, token, onDelta, onDone, onError, onSearchMeta }: {
  messages: { role: string; content: string }[];
  token: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
  onSearchMeta?: (meta: { sources: Source[]; queries: string[]; didSearch: boolean }) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    if (resp.status === 429) { onError("Rate limit exceeded. Please try again in a moment."); return; }
    if (resp.status === 402) { onError("AI credits exhausted. Please add funds in Settings."); return; }
    onError(data.error || `Error ${resp.status}`); return;
  }
  if (!resp.body) { onError("No response stream"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        if (parsed.type === "search_meta" && onSearchMeta) {
          onSearchMeta(parsed);
          continue;
        }
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

// Strips a trailing <followups>...</followups> block from the model output
// and returns { clean, pills }. Pills are pipe-separated short questions.
const FOLLOWUPS_REGEX = /<followups>([\s\S]*?)<\/followups>\s*$/i;
function extractFollowups(content: string): { clean: string; pills: string[] } {
  const match = content.match(FOLLOWUPS_REGEX);
  if (!match) return { clean: content, pills: [] };
  const pills = match[1]
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 80)
    .slice(0, 4);
  return { clean: content.replace(FOLLOWUPS_REGEX, "").trimEnd(), pills };
}

function getFollowUpPills(messages: Message[]): string[] {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return [];
  // Prefer model-generated follow-ups
  const { pills } = extractFollowups(lastAssistant.content);
  if (pills.length > 0) return pills;
  // Fallback: keyword heuristic
  const text = lastAssistant.content.toLowerCase();
  if (text.includes("ballot") || text.includes("election") || text.includes("vote") || text.includes("polling")) {
    return ["Where's my polling place?", "Register to vote", "Vote by mail"];
  }
  if (text.includes("bill") || text.includes("legislation") || text.includes("law") || text.includes("sponsor")) {
    return ["Track this bill", "Contact my rep", "Similar bills"];
  }
  if (text.includes("council") || text.includes("mayor") || text.includes("local") || text.includes("city")) {
    return ["Who's on my city council?", "Next city meeting", "Public comment"];
  }
  if (text.includes("representative") || text.includes("senator") || text.includes("congress")) {
    return ["Contact my representative", "Voting record", "Committee assignments"];
  }
  return ["Tell me more", "What else should I know?", "How does this affect me?"];
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", IA: "Iowa", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  MA: "Massachusetts", MD: "Maryland", ME: "Maine", MI: "Michigan", MN: "Minnesota",
  MO: "Missouri", MS: "Mississippi", MT: "Montana", NC: "North Carolina",
  ND: "North Dakota", NE: "Nebraska", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NV: "Nevada", NY: "New York", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VA: "Virginia",
  VT: "Vermont", WA: "Washington", WI: "Wisconsin", WV: "West Virginia", WY: "Wyoming",
};

const SearchingIndicator = ({ query }: { query?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    className="flex items-center gap-2.5 py-2.5 px-4 rounded-xl max-w-fit my-2 bg-primary/[0.06] border border-primary/20"
  >
    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
      <Globe className="w-4 h-4 text-primary" />
    </motion.div>
    <div className="flex flex-col">
      <span className="text-[13px] text-primary font-medium">Searching the web</span>
      {query && <span className="text-[11px] text-muted-foreground italic truncate max-w-[160px] sm:max-w-[200px]">{query}</span>}
    </div>
    <div className="flex gap-0.5 ml-1">
      {[0, 1, 2].map(i => (
        <motion.span key={i} className="h-1 w-1 rounded-full bg-primary"
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </div>
  </motion.div>
);

const SourcesPanel = ({ sources }: { sources: Source[] }) => {
  if (!sources?.length) return null;
  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center gap-1.5 mb-2">
        <Globe className="w-3 h-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Sources</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source, i) => (
          <a key={i} href={source.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] text-primary no-underline transition-all duration-150 max-w-[200px] bg-foreground/[0.04] border border-border hover:bg-foreground/[0.08]">
            <span className="flex-shrink-0 h-[18px] w-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold bg-primary/15 text-primary">
              {i + 1}
            </span>
            <span className="truncate">{source.title.length > 35 ? source.title.slice(0, 35) + '...' : source.title}</span>
            <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
};

const NonpartisanNotice = ({ message }: { message: Message }) => {
  if (!message.didSearch) return null;
  const lower = message.content.toLowerCase();
  if (!lower.includes('candidate') && !lower.includes('running for') && !lower.includes('campaign')) return null;
  return (
    <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg mt-3 bg-muted/40 border border-border">
      <AlertCircle className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
      <span className="text-[11px] text-muted-foreground leading-relaxed">
        UWAZI provides factual candidate information from public sources. We do not endorse any candidate or party.
      </span>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   HISTORY PANEL — shared content for sidebar & drawer
   ═══════════════════════════════════════════════════ */
function HistoryList({
  groupedHistory, activeSessionId, onLoadSession, onDeleteSession, onNewChat, onClose,
  ctx, civicScore, stateName,
}: {
  groupedHistory: { label: string; chats: ChatSession[] }[];
  activeSessionId: string | null;
  onLoadSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
  ctx: ReturnType<typeof useAskUwaziContext>;
  civicScore: number | null;
  stateName: string | null;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <button onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 hover:border-primary/50 transition-all group">
          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
          New Conversation
        </button>
      </div>

      <ScrollArea className="flex-1 px-2 py-1">
        {groupedHistory.length > 0 ? (
          groupedHistory.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-3 py-1.5 text-[10px] font-heading tracking-[0.15em] uppercase text-muted-foreground/60">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.chats.map((chat) => {
                  const isActive = activeSessionId === chat.id;
                  return (
                    <div key={chat.id}
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                        isActive ? "bg-primary/[0.12] border-l-2 border-primary" : "hover:bg-primary/[0.08] border-l-2 border-transparent"
                      }`}
                      onClick={() => onLoadSession(chat.id)}>
                      <MessageCircle className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <p className={`flex-1 text-[13px] truncate min-w-0 ${isActive ? "text-primary font-medium" : "text-foreground"}`}>
                        {chat.firstMessage.substring(0, 40)}
                      </p>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteSession(chat.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all shrink-0">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center py-12 text-center px-4">
            <MessageCircle className="h-8 w-8 text-muted-foreground/20 mb-3" />
            <p className="text-xs text-muted-foreground">No previous conversations yet.</p>
          </div>
        )}
      </ScrollArea>

      <div className="px-3 py-3 space-y-2 border-t border-primary/10">
        {ctx.zipCode && (
          <div className="flex items-center gap-2 px-2">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-semibold text-primary">{ctx.zipCode}</span>
            {stateName && <span className="text-[10px] text-primary/50">· {stateName}</span>}
          </div>
        )}
        {civicScore !== null && (
          <div className="px-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Civic Literacy</span>
              <span className="text-[10px] font-semibold text-primary">{civicScore}%</span>
            </div>
            <Progress value={civicScore} className="h-1.5 bg-muted [&>div]:bg-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════ */
const FREE_DAILY_LIMIT = 5;

export default function AskUwaziPage() {
  const { session } = useAuth();
  const { displayName } = useProfile();
  const ctx = useAskUwaziContext();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isPremium } = useSubscription();
  const isSubscribed = isPremium;
  const {
    restoredMessages, sessionLoading, saveMessages, startNewSession,
    chatHistory, loadSession, deleteSession,
  } = useAskUwaziSession();
  const suggestedPrompts = getSuggestedPrompts(ctx);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [civicScore, setCivicScore] = useState<number | null>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{
    is_plus: boolean;
    remaining: number | null;
    reset_at: string | null;
  }>({ is_plus: false, remaining: null, reset_at: null });
  const [limited, setLimited] = useState<{ reset_at: string } | null>(null);
  const [optInClosed, setOptInClosed] = useState(
    () => typeof window !== "undefined" && !!sessionStorage.getItem("uwazi_reg_optin_status")
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from("civic_scores").select("civic_literacy_score").eq("user_id", session.user.id).maybeSingle()
      .then(({ data }) => { if (data) setCivicScore(data.civic_literacy_score); });
  }, [session?.user?.id]);

  const fetchDailyCount = useCallback(async () => {
    if (!session?.user?.id || isSubscribed) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("uwazi_question_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .gte("created_at", todayStart.toISOString());
    const todayCount = count ?? 0;
    setDailyCount(todayCount);
    if (todayCount >= FREE_DAILY_LIMIT && !bannerDismissed) {
      setShowBanner(true);
    }
  }, [session?.user?.id, isSubscribed, bannerDismissed]);

  useEffect(() => { fetchDailyCount(); }, [fetchDailyCount]);

  const groupedHistory = useMemo(() => groupChatsByDate(chatHistory), [chatHistory]);

  // NEVER auto-load previous chat — always start with clean welcome
  // restoredMessages is only used when user explicitly loads a session

  useEffect(() => {
    if (restoredMessages && restoredMessages.length > 0) {
      setMessages(restoredMessages.map((m, i) => ({ id: `restored-${i}`, role: m.role, content: m.content })));
    }
  }, [restoredMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const handleCopy = useCallback((msg: Message) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleSaveChat = useCallback(async (assistantMsg: Message) => {
    if (!session?.user?.id || assistantMsg.saved) return;
    const msgIndex = messages.findIndex((m) => m.id === assistantMsg.id);
    const userMsg = messages.slice(0, msgIndex).reverse().find((m) => m.role === "user");
    if (!userMsg) return;
    setSavingId(assistantMsg.id);
    const { error } = await supabase.from("ai_chats").insert({
      user_id: session.user.id, prompt: userMsg.content, response: assistantMsg.content, saved: true,
    });
    setSavingId(null);
    if (error) { toast.error("Failed to save chat"); return; }
    setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, saved: true } : m));
    toast.success("Chat saved!");
  }, [messages, session]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isStreaming || limited) return;

    // Server-side rate-limit check BEFORE anything else
    if (session?.access_token) {
      try {
        const { data: limitData, error: limitErr } = await supabase.functions.invoke(
          "check-ask-limit",
          { body: {} },
        );
        // 429 surfaces as an error with context
        const status = (limitErr as any)?.context?.status;
        if (status === 429 || (limitData && limitData.allowed === false)) {
          const payload = limitData ?? (await (limitErr as any)?.context?.json?.());
          if (payload?.reset_at) setLimited({ reset_at: payload.reset_at });
          setLimitInfo({ is_plus: false, remaining: 0, reset_at: payload?.reset_at ?? null });
          return;
        }
        if (limitErr) {
          toast.error("Unable to verify limit. Try again.");
          return;
        }
        setLimitInfo({
          is_plus: !!limitData.is_plus,
          remaining: limitData.questions_remaining,
          reset_at: limitData.reset_at,
        });
      } catch (e) {
        toast.error("Unable to verify limit. Try again.");
        return;
      }
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    // Log question for daily-count tracking (free users only)
    if (session?.user?.id && !isSubscribed) {
      supabase.from("uwazi_question_log").insert({
        user_id: session.user.id,
        question_text: msg.substring(0, 200),
      }).then(() => fetchDailyCount());
    }

    const likelySearching = willLikelySearch(msg);
    if (likelySearching) {
      setIsSearching(true);
      setSearchStatus(msg.length > 50 ? msg.substring(0, 50) + '...' : msg);
    }

    let assistantContent = "";
    let searchSources: Source[] = [];
    let didSearch = false;

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === "streaming")
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        return [...prev, { id: "streaming", role: "assistant", content: assistantContent, sources: searchSources, didSearch }];
      });
    };

    const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    await streamChat({
      messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      token,
      onSearchMeta: (meta) => {
        searchSources = meta.sources || [];
        didSearch = meta.didSearch || false;
        setCurrentSources(searchSources);
        setIsSearching(false);
      },
      onDelta: (chunk) => {
        if (isSearching) setIsSearching(false);
        upsertAssistant(chunk);
      },
      onDone: () => {
        setMessages((prev) => {
          const final = prev.map((m) =>
            m.id === "streaming"
              ? { ...m, id: Date.now().toString(), sources: searchSources, didSearch }
              : m
          );
          saveMessages(final.map((m) => ({ role: m.role, content: m.content })), ctx.zipCode);
          return final;
        });
        setIsStreaming(false);
        setIsSearching(false);
        setCurrentSources([]);
      },
      onError: (err) => { toast.error(err); setIsStreaming(false); setIsSearching(false); },
    });
  }, [input, isStreaming, limited, messages, session, saveMessages, ctx.zipCode, isSubscribed, fetchDailyCount]);

  // Recheck after window resets in the paywall countdown
  const recheckLimit = useCallback(async () => {
    if (!session?.access_token) return;
    // Lightweight ping: try once; if allowed=true, drop paywall.
    const { data } = await supabase.functions.invoke("check-ask-limit", { body: {} });
    if (data?.allowed) {
      setLimited(null);
      setLimitInfo({
        is_plus: !!data.is_plus,
        remaining: data.questions_remaining,
        reset_at: data.reset_at,
      });
    }
  }, [session?.access_token]);

  // Auto-send when arriving with ?q= prefilled prompt (e.g. from candidate cards)
  const autoSentRef = useRef(false);
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q || autoSentRef.current || isStreaming) return;
    autoSentRef.current = true;
    handleSend(q);
    // Strip the query param so refresh doesn't re-send
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    setSearchParams(next, { replace: true });
  }, [searchParams, isStreaming, handleSend, setSearchParams]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    startNewSession();
    setActiveSessionId(null);
    setHistoryOpen(false);
    inputRef.current?.focus();
  }, [startNewSession]);

  const handleLoadSession = useCallback(async (id: string) => {
    await loadSession(id);
    setActiveSessionId(id);
    setHistoryOpen(false);
  }, [loadSession]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const isEmpty = messages.length === 0;

  if (sessionLoading || ctx.loading) {
    return (
      <div className="flex items-center justify-center bg-background" style={{ height: "100dvh" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl glass flex items-center justify-center">
              <img src={uwaziLogo} alt="UWAZI" className="h-6 w-6" />
            </div>
            <motion.div className="absolute inset-0 rounded-2xl border-2 border-primary/30"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }} />
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stateName = ctx.state ? (STATE_NAMES[ctx.state] || ctx.state) : null;

  const webSearchSuggestions = [
    "Who is running for mayor in my area?",
    "What's the latest on immigration legislation?",
    "Research candidates on my ballot",
    "Current voting record of my senator",
  ];

  const historyContent = (
    <HistoryList
      groupedHistory={groupedHistory}
      activeSessionId={activeSessionId}
      onLoadSession={handleLoadSession}
      onDeleteSession={deleteSession}
      onNewChat={handleNewChat}
      onClose={() => setHistoryOpen(false)}
      ctx={ctx}
      civicScore={civicScore}
      stateName={stateName}
    />
  );

  return (
    <div className="flex relative bg-background overflow-hidden w-full max-w-[100vw]"
      style={{
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
      }}>

      {/* Gradient mesh background */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: `
          radial-gradient(ellipse at 15% 30%, hsl(var(--primary) / 0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 70%, hsl(var(--primary) / 0.04) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, hsl(var(--primary) / 0.02) 0%, transparent 60%)`,
      }} />

      {/* ═══ DESKTOP SIDEBAR — only on md+ ═══ */}
      <AnimatePresence>
        {historyOpen && !isMobile && (
          <motion.aside
            initial={{ x: -260, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -260, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="hidden md:flex relative z-40 w-[260px] h-full flex-col shrink-0 bg-card/80 backdrop-blur-xl border-r border-primary/10">
            <div className="flex items-center justify-between px-4 py-4 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <img src={uwaziLogo} alt="UWAZI" className="h-4 w-4" />
                <h2 className="text-sm font-heading tracking-wide text-foreground">HISTORY</h2>
              </div>
              <button onClick={() => setHistoryOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            {historyContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══ MOBILE BOTTOM SHEET — only on mobile ═══ */}
      {isMobile && (
        <Drawer open={historyOpen} onOpenChange={setHistoryOpen}>
          <DrawerContent className="max-h-[85dvh] bg-card/95 backdrop-blur-xl">
            <DrawerHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={uwaziLogo} alt="UWAZI" className="h-4 w-4" />
                  <DrawerTitle className="text-sm font-heading tracking-wide">HISTORY</DrawerTitle>
                </div>
                <button onClick={() => setHistoryOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden" style={{ height: "calc(85dvh - 80px)" }}>
              {historyContent}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* ═══ MAIN CHAT PANEL ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 bg-background/60 backdrop-blur-2xl">

        {/* ─── Top Bar ─── */}
        <div className="flex items-center justify-between px-3 md:px-5 py-2.5 shrink-0 z-10 topbar-safe border-b border-primary/10 bg-background/90 backdrop-blur-xl">
          {/* Left: Back + History */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors" title="Go back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 p-2 rounded-xl hover:bg-muted text-primary transition-colors" title="Chat History">
              <Clock className="h-5 w-5" />
              <span className="text-[13px] font-medium md:hidden">Chats</span>
            </button>
          </div>

          {/* Center: Logo + title */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <img src={uwaziLogo} alt="UWAZI" className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-heading tracking-wide text-foreground">Ask Uwazi</span>
            <AskLimitPill
              isPlus={isSubscribed || limitInfo.is_plus}
              remaining={limitInfo.remaining}
              resetAt={limited?.reset_at ?? limitInfo.reset_at}
              limited={!!limited}
            />
          </div>

          {/* Right: New Chat */}
          <button onClick={handleNewChat}
            className="p-2 rounded-xl hover:bg-muted text-primary transition-colors" title="New Chat">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* ─── Messages / Empty State ─── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: "touch" }}>
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full px-4 py-6 pb-[100px] md:pb-6">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-center w-full max-w-lg">
                <div className="relative mx-auto mb-4 sm:mb-6 w-16 h-16">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl" />
                  <div className="relative h-16 w-16 rounded-2xl glass-strong flex items-center justify-center border border-primary/20">
                    <img src={uwaziLogo} alt="UWAZI" className="h-8 w-8" />
                  </div>
                </div>
                <h1 className="font-heading text-[28px] sm:text-4xl md:text-5xl text-foreground leading-none mb-2 tracking-tight">
                  ASK UWAZI
                </h1>
                <p className="text-sm text-muted-foreground mb-1">Your Political Co-Pilot</p>

                {/* Location pill */}
                {ctx.zipCode && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mt-2">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span className="text-[11px] font-semibold text-primary">{ctx.zipCode}</span>
                    {stateName && <span className="text-[10px] text-primary/50">· {stateName}</span>}
                  </div>
                )}

                {/* Free question counter */}
                {!isSubscribed && dailyCount > 0 && dailyCount < FREE_DAILY_LIMIT && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-muted-foreground mt-2 ml-2"
                  >
                    <Zap className="w-3 h-3 text-primary" />
                    {FREE_DAILY_LIMIT - dailyCount} free questions left today
                  </motion.div>
                )}
              </motion.div>

              {/* 2x2 Suggestion Cards — always 2 columns */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }} className="mt-5 w-full max-w-lg px-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { icon: Vote, title: "What's on my ballot?", sub: "See your local races", prompt: suggestedPrompts[0] || "What's on my ballot?" },
                    { icon: FileText, title: "Explain a bill", sub: "Plain language breakdown", prompt: suggestedPrompts[2] || "Explain a bill in plain language" },
                    { icon: Landmark, title: "Who represents me?", sub: "Find your officials", prompt: suggestedPrompts[1] || "Who represents me?" },
                    { icon: CalendarDays, title: "Next election", sub: "Dates and deadlines", prompt: suggestedPrompts[3] || "When is the next election?" },
                  ].map((card, i) => (
                    <motion.button key={i}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      onClick={() => handleSend(card.prompt)}
                      className="text-left p-3 rounded-xl cursor-pointer transition-all duration-200 group min-h-[72px] flex flex-col justify-between bg-card/60 border border-primary/15 hover:bg-primary/[0.08] hover:border-primary/40"
                    >
                      <card.icon className="h-5 w-5 text-primary mb-1.5" strokeWidth={1.8} />
                      <div>
                        <p className="text-[12px] sm:text-sm font-semibold text-foreground leading-tight break-words">{card.title}</p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 leading-tight">{card.sub}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Web Search grid — 2x2 */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }} className="mt-4 w-full max-w-lg px-4">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] sm:text-[11px] text-primary font-medium tracking-wide">RESEARCH WITH LIVE WEB SEARCH</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {webSearchSuggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)}
                      className="text-left text-[10px] sm:text-[11px] px-2.5 py-2 rounded-lg transition-all duration-200 leading-tight bg-card/50 border border-primary/15 text-primary hover:bg-primary/[0.08]">
                      <Globe className="w-3 h-3 inline mr-1 opacity-60 shrink-0" />
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-6 pb-[100px] md:pb-6 space-y-6">
              <AnimatePresence mode="popLayout">
                {(() => {
                  let userSeen = 0;
                  return messages.map((msg) => {
                    const isUser = msg.role === "user";
                    if (isUser) userSeen += 1;
                    const showOptInAfter = isUser && userSeen === 2 && !optInClosed;
                    return (
                      <div key={msg.id} className="space-y-6">
                  
                  <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className={msg.role === "user" ? "flex justify-end" : "flex justify-start gap-2 sm:gap-3"}>
                    {msg.role === "assistant" && (
                      <div className="shrink-0 mt-1">
                        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                          <img src={uwaziLogo} alt="UWAZI" className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </div>
                      </div>
                    )}
                    {msg.role === "user" ? (
                      <div className="max-w-[85%] sm:max-w-[80%] ml-auto">
                        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 text-foreground"
                          style={{
                            borderRadius: "18px 18px 4px 18px",
                          }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[90%] sm:max-w-[85%] space-y-2 min-w-0">
                        <div className="p-3 sm:p-4 md:px-5 md:py-4 bg-card/60 backdrop-blur border border-border text-foreground"
                          style={{
                            borderRadius: "4px 18px 18px 18px",
                          }}>
                          <div className="flex items-center gap-2 mb-2">
                            <img src={uwaziLogo} alt="UWAZI" className="h-3 w-3" />
                            <span className="text-[10px] font-heading tracking-wide text-primary/70">UWAZI</span>
                            {msg.didSearch && (
                              <span className="flex items-center gap-1 text-[10px] text-primary/50 ml-1">
                                <Globe className="w-2.5 h-2.5" /> web
                              </span>
                            )}
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-primary/90 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-heading [&_h2]:font-heading [&_h3]:font-heading [&_ul]:space-y-1.5 [&_ol]:space-y-1.5 [&_li]:text-sm [&_p]:text-sm [&_p]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                            <ReactMarkdown>{extractFollowups(msg.content).clean}</ReactMarkdown>
                            {msg.id === "streaming" && isStreaming && (
                              <span className="streaming-cursor" />
                            )}
                          </div>
                          {msg.id !== "streaming" && msg.sources && msg.sources.length > 0 && (
                            <SourcesPanel sources={msg.sources} />
                          )}
                        </div>
                        {msg.id !== "streaming" && <NonpartisanNotice message={msg} />}
                        {msg.id !== "streaming" && (
                          <div className="flex items-center gap-0.5 pl-1 flex-wrap">
                            <button onClick={() => handleCopy(msg)}
                              className="text-[11px] px-2 py-1 rounded-lg transition-all flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                              {copiedId === msg.id ? <><Check className="h-3 w-3 text-primary" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                            </button>
                            <button onClick={() => handleSaveChat(msg)} disabled={msg.saved || savingId === msg.id}
                              className={`text-[11px] px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${msg.saved ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                              {msg.saved ? <><BookmarkCheck className="h-3 w-3" /> Saved</> : <><BookmarkPlus className="h-3 w-3" /> {savingId === msg.id ? "..." : "Save"}</>}
                            </button>
                            <button onClick={() => { navigator.share?.({ text: msg.content }) || handleCopy(msg); }}
                              className="text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded-lg transition-all flex items-center gap-1">
                              <Share2 className="h-3 w-3" /> Share
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                  {showOptInAfter && (
                    <RegistrationOptInCard
                      stateCode={ctx.state}
                      onClose={() => setOptInClosed(true)}
                    />
                  )}
                </div>
                    );
                  });
                })()}
              </AnimatePresence>

              <AnimatePresence>
                {isSearching && <SearchingIndicator query={searchStatus} />}
              </AnimatePresence>

              {isStreaming && !isSearching && messages[messages.length - 1]?.role !== "assistant" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 sm:gap-3 py-3">
                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <img src={uwaziLogo} alt="UWAZI" className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <div className="p-3 sm:p-4 rounded-[4px_18px_18px_18px] bg-card/60 backdrop-blur border border-border">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="dot h-2 w-2 rounded-full bg-primary" />
                        <span className="dot h-2 w-2 rounded-full bg-primary" />
                        <span className="dot h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ─── Follow-up pills ─── */}
        {!isEmpty && !isStreaming && (
          <div className="shrink-0 px-3 sm:px-4 md:px-6 pt-2">
            <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto no-scrollbar">
              {getFollowUpPills(messages).map((pill, i) => (
                <button key={i} onClick={() => handleSend(pill)}
                  className="follow-up-pill whitespace-nowrap text-[12px] sm:text-[13px] shrink-0">
                  {pill}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Soft Paywall Banner ─── */}
        <AnimatePresence>
          {showBanner && !isSubscribed && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="relative mx-4 mb-3 rounded-2xl border border-primary/30 overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--primary) / 0.04) 100%)" }}
            >
              <button
                onClick={() => { setShowBanner(false); setBannerDismissed(true); }}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-foreground/10 hover:bg-foreground/20 flex items-center justify-center transition-colors z-10"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <div className="p-4 pr-10 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-0.5">
                    You're loving Ask Uwazi! 🎉
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    You've used your {FREE_DAILY_LIMIT} free questions today. Unlock unlimited access with Uwazi+ — plus Watch, advanced legislation tracking, and more.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate("/app/settings/subscription")}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl transition-colors"
                    >
                      <Star className="w-3 h-3" />
                      Unlock Uwazi+
                    </button>
                    <button
                      onClick={() => { setShowBanner(false); setBannerDismissed(true); }}
                      className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-3">
                <div className="flex justify-between text-[10px] text-muted-foreground/70 mb-1">
                  <span>{dailyCount} of {FREE_DAILY_LIMIT} free questions used today</span>
                  <span>Resets at midnight</span>
                </div>
                <div className="h-1 bg-foreground/[0.07] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((dailyCount / FREE_DAILY_LIMIT) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Input Area / Limit Paywall ─── */}
        {limited ? (
          <div className="shrink-0 mb-16 md:mb-0">
            <AskLimitPaywall resetAt={limited.reset_at} onReset={recheckLimit} />
          </div>
        ) : (
          <div className="shrink-0 px-3 sm:px-6 py-3 md:py-4 border-t border-primary/10 bg-background/95 backdrop-blur-xl mb-16 md:mb-0"
            style={{
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}>
            <div className="max-w-3xl mx-auto">
              <div className="uwazi-input-container">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex items-end gap-2 sm:gap-3 w-full">
                  <textarea ref={inputRef} rows={1} value={input}
                    onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder={isStreaming ? "Uwazi is typing…" : "Ask about elections, legislation, your rights..."}
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none min-w-0 resize-none leading-relaxed disabled:cursor-not-allowed"
                    style={{ maxHeight: "120px", fontSize: "16px" }}
                    disabled={isStreaming}
                    aria-busy={isStreaming} />
                  <motion.button type="submit" disabled={!input.trim() || isStreaming}
                    whileHover={isStreaming ? undefined : { scale: 1.08 }}
                    whileTap={isStreaming ? undefined : { scale: 0.92 }}
                    aria-label={isStreaming ? "Uwazi is typing" : "Send message"}
                    title={isStreaming ? "Wait for Uwazi to finish…" : "Send"}
                    className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full shrink-0 flex items-center justify-center transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      isStreaming
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : (!input.trim()
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]")
                    }`}>
                    {isStreaming ? (
                      <span className="typing-dots" aria-hidden="true">
                        <span /><span /><span />
                      </span>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </motion.button>
                </form>
              </div>
              <p className="text-[10px] text-muted-foreground/30 text-center mt-2 hidden sm:block">
                Ask Uwazi may make mistakes. Verify important civic information with official sources.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
