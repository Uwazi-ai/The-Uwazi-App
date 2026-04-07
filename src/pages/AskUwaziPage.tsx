import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, BookmarkPlus, BookmarkCheck, Share2, RotateCcw, MapPin,
  Plus, PanelLeftClose, PanelLeftOpen, MessageCircle, Trash2, ArrowLeft, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { useAskUwaziContext, getSuggestedPrompts, useAskUwaziSession } from "@/hooks/useAskUwazi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import uwaziLogo from "@/assets/uwazi-logo.png";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  saved?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-uwazi`;

async function streamChat({ messages, token, onDelta, onDone, onError }: {
  messages: { role: string; content: string }[];
  token: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    if (resp.status === 429) { onError("Rate limit exceeded. Please try again in a moment."); return; }
    if (resp.status === 402) { onError("AI credits exhausted. Please add funds in Settings."); return; }
    onError(data.error || `Error ${resp.status}`);
    return;
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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoredRef = useRef(false);

  // Restore session messages once
  useEffect(() => {
    if (restoredMessages && restoredMessages.length > 0) {
      restoredRef.current = true;
      setMessages(restoredMessages.map((m, i) => ({
        id: `restored-${i}`,
        role: m.role,
        content: m.content,
      })));
    } else if (restoredMessages === null && restoredRef.current) {
      // Session was cleared (new chat)
      setMessages([]);
    }
  }, [restoredMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSaveChat = useCallback(async (assistantMsg: Message) => {
    if (!session?.user?.id || assistantMsg.saved) return;
    const msgIndex = messages.findIndex((m) => m.id === assistantMsg.id);
    const userMsg = messages.slice(0, msgIndex).reverse().find((m) => m.role === "user");
    if (!userMsg) return;

    setSavingId(assistantMsg.id);
    const { error } = await supabase.from("ai_chats").insert({
      user_id: session.user.id,
      prompt: userMsg.content,
      response: assistantMsg.content,
      saved: true,
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

    let assistantContent = "";
    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === "streaming") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { id: "streaming", role: "assistant", content: assistantContent }];
      });
    };

    const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    await streamChat({
      messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      token,
      onDelta: upsertAssistant,
      onDone: () => {
        setMessages((prev) => {
          const final = prev.map((m) => (m.id === "streaming" ? { ...m, id: Date.now().toString() } : m));
          saveMessages(
            final.map((m) => ({ role: m.role, content: m.content })),
            ctx.zipCode
          );
          return final;
        });
        setIsStreaming(false);
      },
      onError: (err) => { toast.error(err); setIsStreaming(false); },
    });
  }, [input, isStreaming, messages, session, saveMessages, ctx.zipCode]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    startNewSession();
    restoredRef.current = false;
    setSidebarOpen(false);
    inputRef.current?.focus();
  }, [startNewSession]);

  const handleLoadSession = useCallback(async (id: string) => {
    await loadSession(id);
    setSidebarOpen(false);
  }, [loadSession]);

  const isEmpty = messages.length === 0;

  if (sessionLoading || ctx.loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="flex items-center gap-3">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="h-3 w-3 rounded-full bg-primary/40"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] md:h-screen relative overflow-hidden">
      {/* ═══ Chat History Sidebar ═══ */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Mobile overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed md:relative z-40 w-[280px] h-full glass-strong flex flex-col shrink-0"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h2 className="text-sm font-semibold text-foreground">Chat History</h2>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground">
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handleNewChat}
                className="mx-3 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 transition-all"
              >
                <Plus className="h-4 w-4" /> New Chat
              </button>

              <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className="group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all"
                    onClick={() => handleLoadSession(chat.id)}
                  >
                    <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{chat.firstMessage}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {chat.updatedAt ? formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true }) : ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(chat.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {chatHistory.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No previous chats</p>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ═══ Main Chat Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 md:px-6 py-2.5 glass border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground transition-colors">
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            )}
            {/* Mobile back */}
            <Link to="/" className="md:hidden p-2 rounded-xl hover:bg-white/5 text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground hidden sm:inline">Ask Uwazi</span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">· Raia G1.0</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {ctx.zipCode && (
              <div className="flex items-center gap-1 px-2.5 py-1 glass rounded-full">
                <MapPin className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-medium text-primary">{ctx.zipCode}</span>
                {ctx.state && <span className="text-[10px] text-primary/60">({ctx.state})</span>}
              </div>
            )}
            {!ctx.zipCode && (
              <Link to="/settings" className="flex items-center gap-1 px-2.5 py-1 glass rounded-full">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-primary font-medium">Set ZIP</span>
              </Link>
            )}
            <button onClick={handleNewChat} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground transition-colors" title="New Chat">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ═══ Messages / Empty State ═══ */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            /* Empty state — centered hero */
            <div className="flex flex-col items-center justify-center h-full px-4 py-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-lg"
              >
                <div className="h-16 w-16 rounded-2xl glass flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground leading-none mb-3">
                  ASK UWAZI
                </h1>
                <p className="text-sm text-muted-foreground mb-1">Your Political Co-Pilot</p>
                <p className="text-xs text-muted-foreground/60">Powered by Raia G1.0 · Nonpartisan · Location-aware</p>
              </motion.div>

              {/* Suggested prompts */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mt-8 w-full max-w-2xl px-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedPrompts.map((p, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.07 }}
                      onClick={() => handleSend(p)}
                      className="glass hover-lift text-left px-4 py-3 rounded-xl text-sm text-foreground/90 hover:text-foreground transition-all"
                    >
                      {p}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            /* Chat messages */
            <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-4 space-y-5">
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    {msg.role === "user" ? (
                      <div className="max-w-[85%] sm:max-w-[75%]">
                        <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground text-sm">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[95%] sm:max-w-[85%] space-y-2">
                        <div className="glass rounded-2xl rounded-tl-sm p-4 md:p-5">
                          <div className="prose prose-sm prose-invert max-w-none [&_a]:text-primary [&_strong]:text-primary/90 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-heading [&_h2]:font-heading [&_h3]:font-heading [&_ul]:space-y-1 [&_ol]:space-y-1 [&_li]:text-sm [&_p]:text-sm [&_p]:leading-relaxed">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          {msg.id === "streaming" && (
                            <span className="inline-block w-2 h-5 bg-primary/60 animate-pulse ml-0.5 rounded-sm" />
                          )}
                        </div>
                        {msg.id !== "streaming" && (
                          <div className="flex items-center gap-1 pl-1">
                            <button
                              onClick={() => handleSaveChat(msg)}
                              disabled={msg.saved || savingId === msg.id}
                              className={`text-[11px] px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                                msg.saved ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                              }`}
                            >
                              {msg.saved ? <><BookmarkCheck className="h-3 w-3" /> Saved</> : <><BookmarkPlus className="h-3 w-3" /> {savingId === msg.id ? "Saving..." : "Save"}</>}
                            </button>
                            <button className="text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/5 px-2 py-1 rounded-lg transition-all flex items-center gap-1">
                              <Share2 className="h-3 w-3" /> Share
                            </button>
                            <button className="text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/5 px-2 py-1 rounded-lg transition-all flex items-center gap-1">
                              <RotateCcw className="h-3 w-3" /> Simplify
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex items-center gap-2.5 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="h-2 w-2 rounded-full bg-primary"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">Ask Uwazi is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ═══ Input Area ═══ */}
        <div className="shrink-0 px-3 sm:px-4 md:px-6 py-3 md:py-4">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="glass-input rounded-2xl flex items-center gap-2 px-4 py-2.5 focus-within:ring-1 focus-within:ring-primary/30 transition-all"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about voting, policies, candidates..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none min-w-0"
                disabled={isStreaming}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isStreaming}
                className="h-9 w-9 rounded-xl shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
              Ask Uwazi is nonpartisan. Responses are AI-generated and should be verified with official sources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
