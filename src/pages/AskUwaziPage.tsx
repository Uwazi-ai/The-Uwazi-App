import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, BookmarkPlus, Share2, ChevronDown, ChevronUp, Shield, ExternalLink, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { name: string; url: string }[];
  keyTakeaways?: string[];
}

const starterPrompts = [
  "What does this ballot measure mean?",
  "Explain a bill in simple language",
  "Who is on my ballot?",
  "How do I register to vote?",
  "What are the voting deadlines?",
  "Compare candidates for me",
];

const mockResponses: Record<string, Partial<Message>> = {
  default: {
    content: "I'd be happy to help you understand that! Here's what you need to know:\n\n**Summary**\nThis is a complex civic topic that affects your community directly. Let me break it down in plain language.\n\n**Key Points**\n• The policy aims to improve public infrastructure in your district\n• Funding comes from a proposed reallocation of existing tax revenue\n• Implementation would begin in the next fiscal year\n\n**Why It Matters**\nThis could affect local services, transportation, and community development in your area.\n\n**Next Steps**\nYou can attend your local town hall meeting or contact your representative to share your thoughts.",
    sources: [
      { name: "Congress.gov", url: "#" },
      { name: "Ballotpedia", url: "#" },
      { name: "Vote.org", url: "#" },
    ],
    keyTakeaways: [
      "This affects local infrastructure funding",
      "No new taxes are proposed",
      "Public comment period ends March 30",
    ],
  },
};

export default function AskUwaziPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const resp = mockResponses.default;
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: resp.content!,
        sources: resp.sources,
        keyTakeaways: resp.keyTakeaways,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const toggleSources = (id: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
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
        {/* Trust Banner */}
        <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-civic-sky rounded-lg">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-medium text-primary">Responses are non-partisan and source-cited</span>
        </div>
      </div>

      {/* Messages Area */}
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
                  {/* Main answer */}
                  <div className="bg-card rounded-2xl rounded-bl-md p-4 shadow-card border border-border">
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {msg.content.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                        part.startsWith("**") && part.endsWith("**") ? (
                          <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Key Takeaways */}
                  {msg.keyTakeaways && (
                    <div className="bg-civic-sky rounded-xl p-3.5">
                      <p className="text-[11px] font-bold uppercase text-primary mb-2 tracking-wider">Key Takeaways</p>
                      <ul className="space-y-1.5">
                        {msg.keyTakeaways.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sources */}
                  {msg.sources && (
                    <div>
                      <button
                        onClick={() => toggleSources(msg.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {expandedSources.has(msg.id) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {msg.sources.length} Sources
                      </button>
                      <AnimatePresence>
                        {expandedSources.has(msg.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-2 space-y-1.5 overflow-hidden"
                          >
                            {msg.sources.map((s, i) => (
                              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-xs text-foreground">
                                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                                {s.name}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Action buttons */}
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
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
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
            disabled={!input.trim() || isTyping}
            className="h-8 w-8 rounded-xl shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
