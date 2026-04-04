import { motion } from "framer-motion";
import { BookmarkCheck, MessageCircle, Vote, Newspaper, FileText, Trash2 } from "lucide-react";

const savedItems = [
  { icon: MessageCircle, type: "Chat", title: "What does Proposition 4 mean?", date: "2 days ago" },
  { icon: Vote, type: "Ballot", title: "Governor Race - Candidate Comparison", date: "3 days ago" },
  { icon: Newspaper, type: "Article", title: "Infrastructure Bill: What It Means", date: "5 days ago" },
  { icon: FileText, type: "Policy", title: "State Housing Policy Changes", date: "1 week ago" },
  { icon: MessageCircle, type: "Chat", title: "How do I register to vote?", date: "1 week ago" },
];

export default function SavedPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookmarkCheck className="h-6 w-6 text-primary" /> Saved Items
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your civic toolkit</p>
      </motion.div>

      <div className="space-y-2">
        {savedItems.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3.5 bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow"
          >
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <item.icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-primary">{item.type}</span>
                <span className="text-[10px] text-muted-foreground">{item.date}</span>
              </div>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-civic-coral transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
