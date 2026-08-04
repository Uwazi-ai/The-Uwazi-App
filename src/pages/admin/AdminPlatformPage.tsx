import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Copy, Download, RefreshCw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const flags = [
  { key: "maintenance_mode", label: "Maintenance Mode", desc: "Shows a banner to all users" },
  { key: "signups_enabled", label: "New User Signups", desc: "Allow new accounts" },
  { key: "ask_uwazi_enabled", label: "Ask Uwazi", desc: "Enable AI assistant" },
  { key: "gamification_enabled", label: "Gamification", desc: "Badges, XP, streaks" },
  { key: "voting_hub_enabled", label: "Voting Hub", desc: "Voting plan features" },
];

export default function AdminPlatformPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addEmail, setAddEmail] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      const map: Record<string, boolean> = {};
      (data || []).forEach(s => { map[s.key] = s.value === "true" || s.value === true; });
      return map;
    },
  });

  const { data: admins, isLoading: adminsLoading } = useQuery({
    queryKey: ["admin-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name, is_admin").eq("is_admin", true);
      return data || [];
    },
  });

  const { data: statsSnapshot } = useQuery({
    queryKey: ["admin-snapshot"],
    queryFn: async () => {
      const [profiles, scores, plans] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("civic_scores").select("lessons_completed, total_xp"),
        supabase.from("voting_plans").select("id", { count: "exact", head: true }),
      ]);
      const scoresData = scores.data || [];
      return {
        totalUsers: profiles.count || 0,
        totalLessons: scoresData.reduce((s, c) => s + (c.lessons_completed || 0), 0),
        totalXp: scoresData.reduce((s, c) => s + (c.total_xp || 0), 0),
        votingPlans: plans.count || 0,
      };
    },
  });

  const toggleFlag = async (key: string, current: boolean) => {
    await supabase.from("platform_settings").update({ value: JSON.stringify(!current), updated_at: new Date().toISOString() }).eq("key", key);
    queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] });
    toast.success(`${key.replace(/_/g, " ")} ${!current ? "enabled" : "disabled"}`);
  };

  const addAdmin = async () => {
    if (!addEmail) return;
    // Find the user profile by searching for matching display name or other means
    // Since we can't query auth.users, we search profiles
    const { data } = await supabase.from("profiles").select("user_id, display_name").ilike("display_name", `%${addEmail}%`).limit(1);
    if (!data?.length) { toast.error("User not found"); return; }
    await supabase.from("profiles").update({ is_admin: true }).eq("user_id", data[0].user_id);
    setAddEmail("");
    queryClient.invalidateQueries({ queryKey: ["admin-list"] });
    toast.success(`${data[0].display_name} is now an admin`);
  };

  const removeAdmin = async (userId: string) => {
    if (userId === user?.id) { toast.error("Cannot remove yourself"); return; }
    await supabase.from("profiles").update({ is_admin: false }).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin-list"] });
    toast.success("Admin removed");
  };

  const forceRefreshAll = async () => {
    const version = `v-${Date.now()}`;
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "force_refresh_version", value: version as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) { toast.error("Failed to trigger refresh"); return; }
    toast.success("All active users will reload to the latest build");
  };

  const copySnapshot = () => {
    if (!statsSnapshot) return;
    const text = `UWAZI.AI Platform Stats\n• Total Users: ${statsSnapshot.totalUsers}\n• Lessons Completed: ${statsSnapshot.totalLessons}\n• Total XP: ${statsSnapshot.totalXp}\n• Voting Plans: ${statsSnapshot.votingPlans}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase font-axis">SUPER ADMIN</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-axis uppercase text-foreground">PLATFORM SETTINGS</h1>
      </div>

      {/* Force Refresh */}
      <Card className="bg-card border-border p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-axis uppercase text-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" /> FORCE REFRESH UI
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Pushes a signal to every active user's browser to unregister the service worker, clear caches, and hard-reload the app — so they immediately see the latest published frontend build. Use after publishing an update.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="gap-1.5 shrink-0"><RefreshCw className="h-3.5 w-3.5" /> Republish UI</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Force refresh all active users?</AlertDialogTitle>
                <AlertDialogDescription>
                  Every user currently using the app will be reloaded within seconds. In-progress unsaved input may be lost. This does not trigger a Lovable deployment — make sure you've already clicked Publish → Update in the editor first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={forceRefreshAll}>Force Refresh</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      {/* Feature Flags */}
      <Card className="bg-card border-border p-4 space-y-4">
        <h3 className="text-sm font-axis uppercase text-foreground">FEATURE FLAGS</h3>
        {isLoading ? <Skeleton className="h-32" /> : flags.map(f => (
          <div key={f.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm text-foreground">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
            <Switch checked={settings?.[f.key] ?? false} onCheckedChange={() => toggleFlag(f.key, settings?.[f.key] ?? false)} />
          </div>
        ))}
      </Card>

      {/* Chat Model */}
      <Card className="bg-card border-border p-4 space-y-4">
        <div>
          <h3 className="text-sm font-axis uppercase text-foreground flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> UWAZI AI CHAT MODEL
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-lg">
            Choose which model answers Ask UWAZI questions. "Auto" lets the cheap
            classifier route simple questions to Sonnet and complex ballot
            reasoning to Opus. Applies instantly — no redeploy needed.
          </p>
        </div>
        {modelLoading ? <Skeleton className="h-10 w-full max-w-sm" /> : (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={chatModel ?? "auto"} onValueChange={saveChatModel}>
              <SelectTrigger className="w-full max-w-sm bg-background border-border">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_CHOICES.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {MODEL_CHOICES.find(m => m.value === (chatModel ?? "auto"))?.desc}
            </span>
          </div>
        )}
      </Card>



      {/* Admin Management */}
      <Card className="bg-card border-border p-4 space-y-4">
        <h3 className="text-sm font-axis uppercase text-foreground">ADMIN MANAGEMENT</h3>
        <div className="space-y-2">
          {adminsLoading ? <Skeleton className="h-10" /> : admins?.map(a => (
            <div key={a.user_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{a.display_name?.[0]?.toUpperCase() || "?"}</div>
                <span className="text-sm text-foreground">{a.display_name}</span>
              </div>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => removeAdmin(a.user_id)} disabled={a.user_id === user?.id}>
                {a.user_id === user?.id ? "You" : "Remove"}
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search user by name..." value={addEmail} onChange={e => setAddEmail(e.target.value)} className="bg-background border-border" />
          <Button size="sm" onClick={addAdmin}>Add Admin</Button>
        </div>
      </Card>

      {/* Stats Snapshot */}
      <Card className="bg-card border-border p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-axis uppercase text-foreground">PLATFORM SNAPSHOT</h3>
          <Button size="sm" variant="outline" onClick={copySnapshot} className="text-xs gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copy for Report
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Users", value: statsSnapshot?.totalUsers },
            { label: "Lessons Completed", value: statsSnapshot?.totalLessons },
            { label: "Total XP", value: statsSnapshot?.totalXp?.toLocaleString() },
            { label: "Voting Plans", value: statsSnapshot?.votingPlans },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-lg bg-background border border-border">
              <p className="text-2xl font-axis text-primary">{s.value ?? 0}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
