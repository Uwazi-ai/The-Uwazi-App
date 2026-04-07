import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, BookmarkPlus, BookmarkCheck, Share2, RotateCcw, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { useAskUwaziContext, getSuggestedPrompts, useAskUwaziSession } from "@/hooks/useAskUwazi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  const ctx = useAskUwaziContext();
  const { restoredMessages, sessionLoading, saveMessages, startNewSession } = useAskUwaziSession();
  const suggestedPrompts = getSuggestedPrompts(ctx);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  const handleSaveChat = useCallback(async (assistantMsg: Message) => {
    if (!session?.user?.id || assistantMsg.saved) return;
    // Find the user message that preceded this assistant message
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

    if (error) {
      toast.error("Failed to save chat");
      return;
    }
    setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, saved: true } : m));
    toast.success("Chat saved!");
  }, [messages, session]);

  // Restore session messages once
  useEffect(() => {
    if (!restoredRef.current && restoredMessages && restoredMessages.length > 0) {
      restoredRef.current = true;
      setMessages(restoredMessages.map((m, i) => ({
        id: `restored-${i}`,
        role: m.role,
        content: m.content,
      })));
    }
  }, [restoredMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          // Persist to session
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
  }, [startNewSession]);

  const isEmpty = messages.length === 0;

  const welcomeMsg = ctx.zipCode
    ? `Hi! I'm Ask Uwazi 👋 I'm your nonpartisan civic AI assistant, powered by Raia G1.0. Ask me anything about local elections, legislation, your ballot, or how to get involved in ${ctx.state || ctx.zipCode}.`
    : `Hi! I'm Ask Uwazi 👋 I'm your nonpartisan civic AI assistant, powered by Raia G1.0. Ask me anything about elections, legislation, your ballot, or how to get involved.`;

  if (sessionLoading || ctx.loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] md:h-[calc(100vh-49px)]">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="h-2.5 w-2.5 rounded-full bg-primary/40" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
          ))}
          <span className="text-sm text-muted-foreground ml-2">Loading Ask Uwazi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] md:h-[calc(100vh-49px)]">
      {/* Hero header (only on empty) */}
      {isEmpty && (
        <div className="px-4 md:px-8 pt-8 pb-4">
          <p className="eyebrow mb-2">Your Political Co-Pilot</p>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground leading-none">ASK UWAZI</h1>
          <p className="text-sm text-muted-foreground mt-2">Powered by Raia G1.0 · Nonpartisan · Location-aware</p>
        </div>
      )}

      {/* Chat header bar */}
      <div className="px-4 md:px-8 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          {ctx.zipCode ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 rounded-pill">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">{ctx.zipCode}</span>
              {ctx.state && <span className="text-[10px] text-primary/70">({ctx.state})</span>}
              <Link to="/settings" className="text-[10px] text-muted-foreground hover:text-foreground ml-1">Change</Link>
            </div>
          ) : (
            <Link to="/settings" className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-pill">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-primary font-medium">Set ZIP for local answers</span>
            </Link>
          )}
        </div>
        {messages.length > 0 && (
          <button onClick={handleNewChat} className="flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary rounded-pill text-xs font-medium hover:bg-primary/10 transition-colors">
            <Plus className="h-3.5 w-3.5" /> New Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-4">
        {isEmpty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[hsl(var(--card))] rounded-card p-4 max-w-[85%] text-sm text-foreground border border-border">
            {welcomeMsg}
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              {msg.role === "user" ? (
                <div className="max-w-[85%] px-4 py-3 rounded-card bg-primary text-primary-foreground text-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[90%] space-y-2">
                  <div className="bg-[hsl(var(--card))] rounded-card p-4 border border-border">
                    <div className="prose prose-sm prose-invert max-w-none [&_a]:text-primary [&_strong]:text-primary/90">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.id === "streaming" && <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />}
                  </div>
                  {msg.id !== "streaming" && (
                    <div className="flex items-center gap-2">
                      <button className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors flex items-center gap-1"><BookmarkPlus className="h-3 w-3" /> Save</button>
                      <button className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors flex items-center gap-1"><Share2 className="h-3 w-3" /> Share</button>
                      <button className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Simplify</button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="h-2 w-2 rounded-full bg-primary/40" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Ask Uwazi is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Dynamic suggested prompts */}
      {isEmpty && suggestedPrompts.length > 0 && (
        <div className="px-4 md:px-8 pb-2">
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((p, i) => (
              <button key={i} onClick={() => handleSend(p)} className="px-3.5 py-2 rounded-pill bg-card border border-border text-sm font-medium text-foreground hover:border-primary/30 transition-all">{p}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 md:px-8 py-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 bg-card border border-border rounded-card px-4 py-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about voting, policies, candidates..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" disabled={isStreaming} />
          <Button type="submit" size="icon" disabled={!input.trim() || isStreaming} className="h-8 w-8 rounded-card shrink-0 bg-primary text-primary-foreground">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
