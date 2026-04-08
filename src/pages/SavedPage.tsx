import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookmarkCheck, MessageCircle, Newspaper, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface SavedChat {
  id: string;
  prompt: string;
  response: string | null;
  created_at: string;
}

interface SavedArticle {
  id: string;
  article_title: string | null;
  article_url: string;
  article_source: string | null;
  saved_at: string | null;
}

interface SavedBill {
  id: string;
  bill_title: string | null;
  bill_url: string | null;
  jurisdiction: string | null;
  saved_at: string | null;
}

type SavedItem = {
  id: string;
  type: "Chat" | "Article" | "Legislation";
  title: string;
  date: string;
  url?: string | null;
};

export default function SavedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      supabase.from("ai_chats").select("id, prompt, response, created_at").eq("user_id", user.id).eq("saved", true).order("created_at", { ascending: false }),
      supabase.from("saved_articles").select("id, article_title, article_url, article_source, saved_at").eq("user_id", user.id).order("saved_at", { ascending: false }),
      supabase.from("saved_legislation").select("id, bill_title, bill_url, jurisdiction, saved_at").eq("user_id", user.id).order("saved_at", { ascending: false }),
    ]).then(([chatsRes, articlesRes, billsRes]) => {
      const all: SavedItem[] = [];

      (chatsRes.data || []).forEach((c: SavedChat) => {
        all.push({
          id: c.id,
          type: "Chat",
          title: c.prompt,
          date: formatDistanceToNow(new Date(c.created_at), { addSuffix: true }),
        });
      });

      (articlesRes.data || []).forEach((a: SavedArticle) => {
        all.push({
          id: a.id,
          type: "Article",
          title: a.article_title || "Untitled Article",
          date: a.saved_at ? formatDistanceToNow(new Date(a.saved_at), { addSuffix: true }) : "",
          url: a.article_url,
        });
      });

      (billsRes.data || []).forEach((b: SavedBill) => {
        all.push({
          id: b.id,
          type: "Legislation",
          title: b.bill_title || "Untitled Bill",
          date: b.saved_at ? formatDistanceToNow(new Date(b.saved_at), { addSuffix: true }) : "",
          url: b.bill_url,
        });
      });

      setItems(all);
      setLoading(false);
    });
  }, [user]);

  const handleDelete = async (item: SavedItem) => {
    const table = item.type === "Chat" ? "ai_chats" : item.type === "Article" ? "saved_articles" : "saved_legislation";

    if (item.type === "Chat") {
      const { error } = await supabase.from("ai_chats").update({ saved: false }).eq("id", item.id);
      if (error) { toast.error("Failed to unsave"); return; }
    } else {
      const { error } = await supabase.from(table).delete().eq("id", item.id);
      if (error) { toast.error("Failed to remove"); return; }
    }

    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success("Removed from saved");
  };

  const iconForType = (type: string) => {
    switch (type) {
      case "Chat": return MessageCircle;
      case "Article": return Newspaper;
      case "Legislation": return FileText;
      default: return MessageCircle;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8 space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookmarkCheck className="h-6 w-6 text-primary" /> Saved Items
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your civic toolkit</p>
      </motion.div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <BookmarkCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No saved items yet</p>
          <p className="text-xs text-muted-foreground mt-1">Save chats, articles, and bills from across UWAZI</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const Icon = iconForType(item.type);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3.5 bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow"
              >
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-primary">{item.type}</span>
                    <span className="text-[10px] text-muted-foreground">{item.date}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
