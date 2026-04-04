import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, BookmarkPlus, Share2, Shield, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-uwazi`;

const starterPrompts = [
  "What does this ballot measure mean?",
  "Explain a bill in simple language",
  "Who is on my ballot?",
  "How do I register to vote?",
  "What are the voting deadlines?",
  "Compare candidates for me",
];

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) {
    onError("No response stream");
    return;
  }

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
      if (json === "[DONE]") {
        onDone();
        return;
      }
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSend = async (text?: string) => {
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
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { id: "streaming", role: "assistant", content: assistantContent }];
      });
    };

    await streamChat({
      messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      onDelta: upsertAssistant,
      onDone: () => {
        setMessages((prev) =>
          prev.map((m) => (m.id === "streaming" ? { ...m, id: Date.now().toString() } : m))
        );
        setIsStreaming(false);
      },
      onError: (err) => {
        toast.error(err);
        setIsStreaming(false);
      },
    });
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl gradient-civic flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Ask UWAZI</h1>
            <p className="text-[11px] text-muted-foreground">Non-partisan civic AI assistant</p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 rounded-lg">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-medium text-primary">Responses are non-partisan and source-cited</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isEmpty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-16 w-16 rounded-2xl gradient-civic flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">Ask me anything civic</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Get plain-language answers about voting, legislation, candidates, and public policy.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {starterPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="px-3.5 py-2 rounded-pill bg-card shadow-card border border-border text-sm font-medium text-foreground hover:shadow-elevated hover:border-primary/30 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              {msg.role === "user" ? (
                <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md gradient-civic text-primary-foreground text-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[95%] space-y-3">
                  <div className="bg-card rounded-2xl rounded-bl-md p-4 shadow-card border border-border">
                    <div className="prose prose-sm prose-invert max-w-none text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h4]:text-foreground [&_strong]:text-foreground [&_li]:text-foreground [&_p]:text-foreground [&_a]:text-primary [&_hr]:border-border">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.id === "streaming" && (
                      <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />
                    )}
                  </div>

                  {msg.id !== "streaming" && (
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors">
                        <BookmarkPlus className="h-3.5 w-3.5" /> Save
                      </button>
                      <button className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Share2 className="h-3.5 w-3.5" /> Share
                      </button>
                      <button className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors">
                        <RotateCcw className="h-3.5 w-3.5" /> Simplify
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-4 py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary/40"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">UWAZI is thinking...</span>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-md">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about voting, policies, candidates..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
            className="h-8 w-8 rounded-xl shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
