import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;
interface N { id: string; title: string; body: string | null; link: string | null }

export function NotificationCard() {
  const { user } = useAuth();
  const [n, setN] = useState<N | null>(null);

  useEffect(() => {
    if (!user) return;
    db.from("user_notifications").select("id, title, body, link").eq("user_id", user.id).is("read_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: any) => setN(data ?? null));
  }, [user]);

  if (!n) return null;
  const dismiss = async () => {
    setN(null);
    await db.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
  };

  return (
    <div className="relative rounded-2xl border border-primary/30 bg-primary/10 p-4" data-testid="notification-card">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-6">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-axis text-base text-foreground">{n.title}</p>
          {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
          {n.link && <Link to={n.link} onClick={dismiss} className="inline-block pt-1 text-sm font-semibold text-primary">See more</Link>}
        </div>
      </div>
    </div>
  );
}
