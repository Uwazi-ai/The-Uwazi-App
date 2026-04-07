import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, BookmarkPlus, BookmarkCheck, Share2, RotateCcw, MapPin,
  Plus, PanelLeftClose, PanelLeftOpen, MessageCircle, Trash2,
  ArrowLeft, Copy, Check, Vote, FileText, Landmark, CalendarDays,
  Globe, ExternalLink, AlertCircle, Search,
} from "lucide-react";
import uwaziLogo from "@/assets/uwazi-logo.png";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { useAskUwaziContext, getSuggestedPrompts, useAskUwaziSession, type ChatSession } from "@/hooks/useAskUwazi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { formatDistanceToNow, isToday, isYesterday, differenceInDays } from "date-fns";

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

// ─── Search trigger detection ───
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

// ─── Group chats by date ───
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

// ─── Stream helper (with search metadata support) ───
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
        // Check for search metadata event
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

// ─── Follow-up pills ───
function getFollowUpPills(messages: Message[]): string[] {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return [];
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

// ─── State names ───
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

// ─── Searching Indicator ───
const SearchingIndicator = ({ query }: { query?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    className="flex items-center gap-2.5 py-2.5 px-4 rounded-xl max-w-fit my-2"
    style={{
      background: "rgba(155, 211, 75, 0.06)",
      border: "1px solid rgba(155, 211, 75, 0.2)",
    }}
  >
    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
      <Globe className="w-4 h-4 text-primary" />
    </motion.div>
    <div className="flex flex-col">
      <span className="text-[13px] text-primary font-medium">Searching the web</span>
      {query && <span className="text-[11px] text-muted-foreground italic truncate max-w-[180px] sm:max-w-[200px]">{query}</span>}
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

// ─── Sources Panel ───
const SourcesPanel = ({ sources }: { sources: Source[] }) => {
  if (!sources?.length) return null;
  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Globe className="w-3 h-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Sources</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source, i) => (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] text-primary no-underline transition-all duration-150 max-w-[220px]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(155,211,75,0.08)";
              e.currentTarget.style.borderColor = "rgba(155,211,75,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            <span className="flex-shrink-0 h-[18px] w-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold"
              style={{ background: "rgba(155,211,75,0.15)", color: "#9bd34b" }}>
              {i + 1}
            </span>
            <span className="truncate">{source.title.length > 40 ? source.title.slice(0, 40) + '...' : source.title}</span>
            <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
};

// ─── Nonpartisan Notice ───
const NonpartisanNotice = ({ message }: { message: Message }) => {
  if (!message.didSearch) return null;
  const lower = message.content.toLowerCase();
  if (!lower.includes('candidate') && !lower.includes('running for') && !lower.includes('campaign')) return null;
  return (
    <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg mt-3"
      style={{
        background: "rgba(255, 200, 0, 0.05)",
        border: "1px solid rgba(255, 200, 0, 0.15)",
      }}
    >
      <AlertCircle className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
      <span className="text-[11px] text-muted-foreground leading-relaxed">
        UWAZI provides factual candidate information from public sources. We do not endorse any candidate or party. Always verify with official campaign sources.
      </span>
    </div>
  );
};

export default function AskUwaziPage() {
  const { session } = useAuth();
  const { displayName, avatarUrl } = useProfile();
  const ctx = useAskUwaziContext();
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [civicScore, setCivicScore] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from("civic_scores").select("civic_literacy_score").eq("user_id", session.user.id).maybeSingle()
      .then(({ data }) => { if (data) setCivicScore(data.civic_literacy_score); });
  }, [session?.user?.id]);

  const groupedHistory = useMemo(() => groupChatsByDate(chatHistory), [chatHistory]);

  useEffect(() => {
    if (restoredMessages && restoredMessages.length > 0) {
      restoredRef.current = true;
      setMessages(restoredMessages.map((m, i) => ({ id: `restored-${i}`, role: m.role, content: m.content })));
    } else if (restoredMessages === null && restoredRef.current) {
      setMessages([]);
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
    if (!msg || isStreaming) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    // Show searching indicator if likely to search
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
        setIsSearching(false); // Search done, now streaming response
      },
      onDelta: (chunk) => {
        // Once we get first delta, searching is done
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
  }, [input, isStreaming, messages, session, saveMessages, ctx.zipCode]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    startNewSession();
    setActiveSessionId(null);
    restoredRef.current = false;
    setSidebarOpen(false);
    inputRef.current?.focus();
  }, [startNewSession]);

  const handleLoadSession = useCallback(async (id: string) => {
    await loadSession(id);
    setActiveSessionId(id);
    setSidebarOpen(false);
  }, [loadSession]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const isEmpty = messages.length === 0;

  if (sessionLoading || ctx.loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-background">
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

  // Web search suggestion cards for empty state
  const webSearchSuggestions = [
    "Who is running for mayor in my area?",
    "What's the latest on immigration legislation?",
    "Research candidates on my ballot",
    "Current voting record of my senator",
  ];

  return (
    <div className="flex relative overflow-hidden bg-background" style={{ height: "100dvh", paddingTop: "env(safe-area-inset-top)" }}>

      {/* ═══ Animated gradient mesh background ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: `
          radial-gradient(ellipse at 15% 30%, rgba(155,211,75,0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 70%, rgba(155,211,75,0.04) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(155,211,75,0.02) 0%, transparent 60%)`,
        animation: "meshShift 8s ease-in-out infinite alternate",
      }} />

      {/* ═══ SIDEBAR — Chat History ═══ */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setSidebarOpen(false)} />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed md:relative z-40 w-[260px] h-full flex flex-col shrink-0"
              style={{
                background: "rgba(10, 10, 10, 0.8)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRight: "1px solid rgba(155, 211, 75, 0.1)",
              }}
            >
              <div className="flex items-center justify-between px-4 py-4"
                style={{ borderBottom: "1px solid rgba(155, 211, 75, 0.1)" }}>
                <div className="flex items-center gap-2">
                  <img src={uwaziLogo} alt="UWAZI" className="h-4 w-4" />
                  <h2 className="text-sm font-heading tracking-wide text-foreground">HISTORY</h2>
                </div>
                <button onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              <div className="px-3 pt-3">
                <button onClick={handleNewChat}
                  className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 hover:border-primary/50 transition-all group">
                  <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                  New Conversation
                </button>
              </div>

              <ScrollArea className="flex-1 px-2 py-2">
                {groupedHistory.length > 0 ? (
                  groupedHistory.map((group) => (
                    <div key={group.label} className="mb-3">
                      <p className="px-3 py-1.5 text-[10px] font-heading tracking-[0.15em] uppercase text-muted-foreground/60">
                        {group.label}
                      </p>
                      <div className="space-y-0.5">
                        {group.chats.map((chat, i) => {
                          const isActive = activeSessionId === chat.id;
                          return (
                            <motion.div
                              key={chat.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.02 }}
                              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                                isActive
                                  ? "bg-primary/[0.12] border-l-2 border-primary"
                                  : "hover:bg-primary/[0.08] border-l-2 border-transparent"
                              }`}
                              onClick={() => handleLoadSession(chat.id)}
                            >
                              <MessageCircle className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-[13px] truncate ${isActive ? "text-primary font-medium" : "text-foreground"}`}>
                                  {chat.firstMessage.substring(0, 40)}
                                </p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteSession(chat.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center py-12 text-center px-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground/20 mb-3" />
                    <p className="text-xs text-muted-foreground">No previous conversations yet.</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">Start asking about civic topics!</p>
                  </div>
                )}
              </ScrollArea>

              <div className="px-3 py-3 space-y-3" style={{ borderTop: "1px solid rgba(155, 211, 75, 0.1)" }}>
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ═══ MAIN CHAT PANEL ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative z-10"
        style={{
          background: "rgba(13, 13, 13, 0.6)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        }}>

        {/* ─── Top Bar ─── */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between px-3 md:px-5 py-2.5 shrink-0 z-10"
          style={{ borderBottom: "1px solid rgba(155, 211, 75, 0.08)" }}>
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                <PanelLeftOpen className="h-5 w-5" />
              </motion.button>
            )}
            <Link to="/" className="md:hidden p-2 rounded-xl hover:bg-muted text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <img src={uwaziLogo} alt="UWAZI" className="h-3.5 w-3.5" />
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-heading tracking-wide text-foreground">ASK UWAZI</span>
                <span className="text-[10px] text-muted-foreground ml-2">Raia G1.0</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Web Search Badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{
                background: "rgba(155,211,75,0.1)",
                border: "1px solid rgba(155,211,75,0.25)",
                color: "#9bd34b",
              }}>
              <Globe className="w-3 h-3" />
              <span className="hidden sm:inline">Web Search On</span>
            </div>

            {ctx.zipCode && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <MapPin className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-semibold text-primary">{ctx.zipCode}</span>
                {ctx.state && <span className="text-[10px] text-primary/60">· {ctx.state}</span>}
              </div>
            )}
            {!ctx.zipCode && (
              <Link to="/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border hover:border-primary/30 transition-colors">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-primary font-medium">Set ZIP</span>
              </Link>
            )}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleNewChat}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors" title="New Chat">
              <Plus className="h-5 w-5" />
            </motion.button>
          </div>
        </motion.div>

        {/* ─── Messages / Empty State ─── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full px-3 sm:px-4 py-8">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-center max-w-lg">
                <div className="relative mx-auto mb-8 w-20 h-20">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl" />
                  <div className="relative h-20 w-20 rounded-2xl glass-strong flex items-center justify-center border border-primary/20">
                    <img src={uwaziLogo} alt="UWAZI" className="h-10 w-10" />
                  </div>
                </div>
                <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground leading-none mb-3 tracking-tight">
                  ASK UWAZI
                </h1>
                <p className="text-base text-muted-foreground mb-1">Your Political Co-Pilot</p>
                <p className="text-xs text-muted-foreground/50">Nonpartisan · Location-aware · Powered by Raia G1.0</p>
              </motion.div>

              {/* Standard suggestion cards */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }} className="mt-8 w-full max-w-2xl px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="text-left p-4 rounded-xl cursor-pointer transition-all duration-200 group"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(155,211,75,0.15)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(155,211,75,0.08)";
                        e.currentTarget.style.borderColor = "rgba(155,211,75,0.4)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.borderColor = "rgba(155,211,75,0.15)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <card.icon className="h-5 w-5 text-primary mb-2" strokeWidth={1.8} />
                      <p className="text-sm font-medium text-foreground">{card.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Web Search suggestion row */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }} className="mt-5 w-full max-w-2xl px-4">
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] text-primary font-medium tracking-wide">RESEARCH WITH LIVE WEB SEARCH</span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {webSearchSuggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)}
                      className="whitespace-nowrap text-[12px] px-3.5 py-2 rounded-lg shrink-0 transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(100,180,255,0.15)",
                        color: "#9bd34b",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(155,211,75,0.06)";
                        e.currentTarget.style.borderColor = "rgba(155,211,75,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                        e.currentTarget.style.borderColor = "rgba(100,180,255,0.15)";
                      }}
                    >
                      <Globe className="w-3 h-3 inline mr-1.5 opacity-60" />
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-6 space-y-6">
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                  <motion.div key={msg.id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className={msg.role === "user" ? "flex justify-end" : "flex justify-start gap-3"}>
                    {msg.role === "assistant" && (
                      <div className="shrink-0 mt-1">
                        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                          <img src={uwaziLogo} alt="UWAZI" className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    )}
                    {msg.role === "user" ? (
                      <div className="max-w-[80%] ml-auto">
                        <div className="px-4 py-3 text-sm leading-relaxed"
                          style={{
                            background: "linear-gradient(135deg, rgba(155,211,75,0.2), rgba(155,211,75,0.1))",
                            border: "1px solid rgba(155,211,75,0.3)",
                            borderRadius: "18px 18px 4px 18px",
                            color: "#F0F6FC",
                          }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[85%] space-y-2">
                        <div className="p-4 md:px-5 md:py-4"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            backdropFilter: "blur(10px)",
                            WebkitBackdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "4px 18px 18px 18px",
                            color: "#F0F6FC",
                          }}>
                          <div className="flex items-center gap-2 mb-2">
                            <img src={uwaziLogo} alt="UWAZI" className="h-3 w-3" />
                            <span className="text-[10px] font-heading tracking-wide text-primary/70">UWAZI</span>
                            {msg.didSearch && (
                              <span className="flex items-center gap-1 text-[10px] text-primary/50 ml-1">
                                <Globe className="w-2.5 h-2.5" /> web search
                              </span>
                            )}
                          </div>
                          <div className="prose prose-sm prose-invert max-w-none [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-primary/90 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-heading [&_h2]:font-heading [&_h3]:font-heading [&_h1]:tracking-wide [&_h2]:tracking-wide [&_ul]:space-y-1.5 [&_ol]:space-y-1.5 [&_li]:text-sm [&_p]:text-sm [&_p]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          {msg.id === "streaming" && (
                            <span className="inline-block w-2 h-5 bg-primary/60 animate-pulse ml-0.5 rounded-sm" />
                          )}

                          {/* Sources Panel */}
                          {msg.id !== "streaming" && msg.sources && msg.sources.length > 0 && (
                            <SourcesPanel sources={msg.sources} />
                          )}
                        </div>

                        {/* Nonpartisan Notice */}
                        {msg.id !== "streaming" && <NonpartisanNotice message={msg} />}

                        {msg.id !== "streaming" && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                            className="flex items-center gap-0.5 pl-1">
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
                            <button className="text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded-lg transition-all flex items-center gap-1">
                              <RotateCcw className="h-3 w-3" /> Simplify
                            </button>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Searching indicator */}
              <AnimatePresence>
                {isSearching && <SearchingIndicator query={searchStatus} />}
              </AnimatePresence>

              {/* Typing indicator (when streaming but no assistant message yet and not searching) */}
              {isStreaming && !isSearching && messages[messages.length - 1]?.role !== "assistant" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 py-3"
                >
                  <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <img src={uwaziLogo} alt="UWAZI" className="h-3.5 w-3.5" />
                  </div>
                  <div className="p-4 rounded-[4px_18px_18px_18px]"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                    <div className="flex items-center gap-2 mb-2">
                      <img src={uwaziLogo} alt="UWAZI" className="h-3 w-3" />
                      <span className="text-[10px] font-heading tracking-wide text-primary/70">UWAZI</span>
                    </div>
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
                  className="follow-up-pill whitespace-nowrap text-[13px] shrink-0">
                  {pill}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Input Area ─── */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="shrink-0 px-3 sm:px-6 py-3 md:py-4" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="max-w-3xl mx-auto">
            <div className="uwazi-input-container">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-end gap-3 w-full">
                <textarea ref={inputRef} rows={1} value={input}
                  onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Ask about elections, legislation, your rights..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none min-w-0 resize-none leading-relaxed"
                  style={{ maxHeight: "120px" }}
                  disabled={isStreaming} />
                <motion.button type="submit" disabled={!input.trim() || isStreaming}
                  whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center transition-all disabled:opacity-40"
                  style={{
                    background: (!input.trim() || isStreaming) ? "rgba(255,255,255,0.1)" : "#9bd34b",
                    boxShadow: (!input.trim() || isStreaming) ? "none" : "0 0 12px rgba(155,211,75,0.3)",
                  }}>
                  <Send className="h-4 w-4" style={{ color: (!input.trim() || isStreaming) ? "rgba(255,255,255,0.3)" : "#0A0A0A" }} />
                </motion.button>
              </form>
            </div>
            <p className="text-[10px] text-muted-foreground/30 text-center mt-2">
              Ask Uwazi may make mistakes. Verify important civic information with official sources.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
