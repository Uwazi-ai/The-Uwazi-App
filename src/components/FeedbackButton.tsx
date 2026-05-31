import { useState } from "react";
import { MessageSquarePlus, X, Send, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

const CATEGORIES = [
  { id: "bug", label: "🐞 Bug" },
  { id: "idea", label: "💡 Idea" },
  { id: "love", label: "❤️ Love it" },
  { id: "general", label: "💬 General" },
];

export function FeedbackButton() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const reset = () => {
    setMessage("");
    setCategory("general");
    setSent(false);
  };

  const close = () => {
    setOpen(false);
    setTimeout(reset, 300);
  };

  const submit = async () => {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from("beta_feedback").insert({
      user_id: user?.id ?? null,
      // Only attach email when authenticated (uses verified auth email); anon submissions stay anonymous per RLS
      email: user?.email ?? null,
      category,
      message: message.trim(),
      page_url: location.pathname,
      user_agent: navigator.userAgent,
    });

    setSubmitting(false);
    if (!error) {
      setSent(true);
      setTimeout(close, 1800);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Give feedback"
        className="fixed z-40 bottom-24 right-4 md:bottom-6 md:right-6 flex items-center gap-2 px-4 py-3 rounded-full bg-[#9bd34b] hover:bg-[#aee06a] text-black font-bold text-sm shadow-[0_8px_24px_-8px_rgba(155,211,75,0.6)] transition-colors"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
        <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-black/15">BETA</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="fixed z-50 inset-x-4 bottom-4 md:inset-x-auto md:right-6 md:bottom-6 md:w-[400px] rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 shadow-2xl"
            >
              {sent ? (
                <div className="py-10 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-[#9bd34b]/15 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-[#9bd34b]" />
                  </div>
                  <p className="text-white font-bold">Thanks for the feedback!</p>
                  <p className="text-white/50 text-sm mt-1">We read every note.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-[10px] font-bold tracking-[0.2em] text-[#9bd34b] mb-1">BETA · FEEDBACK</div>
                      <h3 className="text-lg font-black text-white">Help us make UWAZI better</h3>
                    </div>
                    <button onClick={close} aria-label="Close" className="text-white/40 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          category === c.id
                            ? "border-[#9bd34b]/50 bg-[#9bd34b]/10 text-[#9bd34b]"
                            : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What's working? What's broken? What would you love to see?"
                    rows={5}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#9bd34b]/50 resize-none"
                  />

                  {!user && (
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email (optional — for follow-up)"
                      className="w-full mt-2 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#9bd34b]/50"
                    />
                  )}

                  <button
                    onClick={submit}
                    disabled={!message.trim() || submitting}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#9bd34b] hover:bg-[#aee06a] text-black font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "Sending…" : "Send feedback"}
                  </button>
                  <p className="text-[10px] text-white/35 text-center mt-2">
                    Nonpartisan · We never share your feedback
                  </p>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
