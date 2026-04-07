import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, BookmarkPlus, BookmarkCheck, Share2, RotateCcw, MapPin,
  Plus, PanelLeftClose, PanelLeftOpen, MessageCircle, Trash2,
  ArrowLeft, Sparkles, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredMessages && restoredMessages.length > 0) {
      restoredRef.current = true;
      setMessages(restoredMessages.map((m, i) => ({
        id: `restored-${i}`,
        role: m.role,
        content: m.content,
      })));
    } else if (restoredMessages === null && restoredRef.current) {
      setMessages([]);
    }
  }, [restoredMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const isEmpty = messages.length === 0;

  if (sessionLoading || ctx.loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl glass flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-primary/30"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] md:h-screen relative overflow-hidden bg-background">

      {/* ═══ SIDEBAR — Chat History ═══ */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed md:relative z-40 w-[260px] h-full flex flex-col shrink-0"
              style={{
                background: "rgba(10, 10, 10, 0.8)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRight: "1px solid rgba(155, 211, 75, 0.1)",
              }}
            >
              {/* Sidebar header */}
              <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid rgba(155, 211, 75, 0.1)" }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-heading tracking-wide text-foreground">HISTORY</h2>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              {/* New chat button */}
              <div className="px-3 pt-3">
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 hover:border-primary/50 transition-all group"
                >
                  <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                  New Conversation
                </button>
              </div>

              {/* Chat list */}
              <ScrollArea className="flex-1 px-2 py-2">
                <div className="space-y-0.5">
                  {chatHistory.map((chat, i) => (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group flex items-center gap-2 px-3 py-3 rounded-xl hover:bg-muted cursor-pointer transition-all"
                      onClick={() => handleLoadSession(chat.id)}
                    >
                      <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{chat.firstMessage}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {chat.updatedAt ? formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true }) : ""}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(chat.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                  {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center py-12 text-center">
                      <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-3" />
                      <p className="text-xs text-muted-foreground">No conversations yet</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Start a new chat below</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Sidebar footer */}
              <div className="px-3 py-3" style={{ borderTop: "1px solid rgba(155, 211, 75, 0.1)" }}>
                <div className="flex items-center gap-3 px-2">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      displayName[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ═══ MAIN CHAT PANEL ═══ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ─── Top Bar ─── */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-border bg-background/80 backdrop-blur-xl shrink-0 z-10"
        >
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </motion.button>
            )}
            <Link to="/" className="md:hidden p-2 rounded-xl hover:bg-muted text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-heading tracking-wide text-foreground">ASK UWAZI</span>
                <span className="text-[10px] text-muted-foreground ml-2">Raia G1.0</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {ctx.zipCode && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
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
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewChat}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
              title="New Chat"
            >
              <Plus className="h-5 w-5" />
            </motion.button>
          </div>
        </motion.div>

        {/* ─── Messages / Empty State ─── */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full px-4 py-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-center max-w-lg"
              >
                {/* Glowing logo */}
                <div className="relative mx-auto mb-8 w-20 h-20">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl" />
                  <div className="relative h-20 w-20 rounded-2xl glass-strong flex items-center justify-center border border-primary/20">
                    <Sparkles className="h-10 w-10 text-primary" />
                  </div>
                </div>

                <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl text-foreground leading-none mb-3 tracking-tight">
                  ASK UWAZI
                </h1>
                <p className="text-base text-muted-foreground mb-1">Your Civic Intelligence Co-Pilot</p>
                <p className="text-xs text-muted-foreground/50">Nonpartisan · Location-aware · Powered by Raia G1.0</p>
              </motion.div>

              {/* Suggested prompts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-10 w-full max-w-2xl px-4"
              >
                <p className="text-[10px] font-heading tracking-[0.15em] text-primary/60 uppercase text-center mb-4">
                  Suggested Questions
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {suggestedPrompts.map((p, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSend(p)}
                      className="glass text-left px-4 py-3.5 rounded-xl text-sm text-foreground/80 hover:text-foreground hover:border-primary/20 transition-all group"
                    >
                      <span className="group-hover:text-primary transition-colors">{p}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            /* Chat messages */
            <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-6 space-y-6">
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className={msg.role === "user" ? "flex justify-end" : "flex justify-start gap-3"}
                  >
                    {/* Assistant avatar */}
                    {msg.role === "assistant" && (
                      <div className="shrink-0 mt-1">
                        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </div>
                    )}

                    {msg.role === "user" ? (
                      <div className="max-w-[85%] sm:max-w-[75%]">
                        <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground text-sm leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[92%] sm:max-w-[85%] space-y-2">
                        <div className="glass rounded-2xl rounded-tl-sm p-4 md:p-5">
                          <div className="prose prose-sm prose-invert max-w-none [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-primary/90 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-heading [&_h2]:font-heading [&_h3]:font-heading [&_h1]:tracking-wide [&_h2]:tracking-wide [&_ul]:space-y-1.5 [&_ol]:space-y-1.5 [&_li]:text-sm [&_p]:text-sm [&_p]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          {msg.id === "streaming" && (
                            <span className="inline-block w-2 h-5 bg-primary/60 animate-pulse ml-0.5 rounded-sm" />
                          )}
                        </div>

                        {/* Action buttons */}
                        {msg.id !== "streaming" && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-0.5 pl-1"
                          >
                            <button
                              onClick={() => handleCopy(msg)}
                              className="text-[11px] px-2 py-1 rounded-lg transition-all flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              {copiedId === msg.id ? <><Check className="h-3 w-3 text-primary" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                            </button>
                            <button
                              onClick={() => handleSaveChat(msg)}
                              disabled={msg.saved || savingId === msg.id}
                              className={`text-[11px] px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                                msg.saved ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              {msg.saved ? <><BookmarkCheck className="h-3 w-3" /> Saved</> : <><BookmarkPlus className="h-3 w-3" /> {savingId === msg.id ? "..." : "Save"}</>}
                            </button>
                            <button
                              onClick={() => {
                                navigator.share?.({ text: msg.content }) || handleCopy(msg);
                              }}
                              className="text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                            >
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

              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex items-center gap-3 py-3">
                  <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="h-2 w-2 rounded-full bg-primary"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ─── Input Area ─── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="shrink-0 px-3 sm:px-4 md:px-6 py-3 md:py-4 bg-background"
        >
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="relative glass-input rounded-2xl flex items-end gap-2 px-4 py-3 focus-within:ring-1 focus-within:ring-primary/40 transition-all"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about voting, policies, candidates..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none min-w-0 resize-none max-h-40 leading-relaxed"
                disabled={isStreaming}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isStreaming}
                className="h-9 w-9 rounded-xl shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-20"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground/30 text-center mt-2">
              Nonpartisan · AI-generated · Verify with official sources
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
