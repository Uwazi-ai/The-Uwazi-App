import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AdminAlertsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [alertType, setAlertType] = useState("info");
  const [targetType, setTargetType] = useState("all");
  const [targetZips, setTargetZips] = useState("");
  const [sending, setSending] = useState(false);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("civic_alerts").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const sendAlert = async () => {
    if (!title || !message || !user) { toast.error("Title and message required"); return; }
    setSending(true);
    const { error } = await supabase.from("civic_alerts").insert({
      title,
      message,
      alert_type: alertType,
      target_type: targetType,
      target_zips: targetType === "zip" ? targetZips.split(",").map(z => z.trim()) : null,
      sent_at: new Date().toISOString(),
      created_by: user.id,
    });
    setSending(false);
    if (error) { toast.error("Failed to send"); return; }
    toast.success("Alert sent!");
    setTitle(""); setMessage("");
    queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase font-axis">SUPER ADMIN</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-axis uppercase text-foreground">ALERTS & BROADCAST</h1>
      </div>

      <Card className="bg-card border-border p-4 space-y-4">
        <h3 className="text-sm font-axis uppercase text-foreground">CREATE ALERT</h3>
        <Input placeholder="Alert title" value={title} onChange={e => setTitle(e.target.value)} className="bg-background border-border" />
        <Textarea placeholder="Alert message..." value={message} onChange={e => setMessage(e.target.value)} className="bg-background border-border min-h-[100px]" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={alertType} onValueChange={setAlertType}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["info", "election_reminder", "new_lesson", "urgent"].map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Target</label>
            <Select value={targetType} onValueChange={setTargetType}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["all", "zip", "admins"].map(t => <SelectItem key={t} value={t}>{t === "zip" ? "By ZIP" : t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {targetType === "zip" && (
          <Input placeholder="Enter ZIP codes (comma-separated)" value={targetZips} onChange={e => setTargetZips(e.target.value)} className="bg-background border-border" />
        )}
        <Button onClick={sendAlert} disabled={sending} className="gap-1.5">
          <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Alert"}
        </Button>
      </Card>

      <Card className="bg-card border-border p-4">
        <h3 className="text-sm font-axis uppercase text-foreground mb-3">SENT ALERTS</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-2 font-medium">Title</th>
              <th className="p-2 font-medium hidden md:table-cell">Type</th>
              <th className="p-2 font-medium hidden md:table-cell">Target</th>
              <th className="p-2 font-medium">Sent</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="p-3"><Skeleton className="h-6" /></td></tr>}
            {alerts?.map(a => (
              <tr key={a.id} className="border-b border-border hover:bg-primary/5">
                <td className="p-2 text-foreground">{a.title}</td>
                <td className="p-2 text-muted-foreground hidden md:table-cell capitalize">{(a.alert_type || "").replace("_", " ")}</td>
                <td className="p-2 text-muted-foreground hidden md:table-cell capitalize">{a.target_type}</td>
                <td className="p-2 text-xs text-muted-foreground">{a.sent_at ? new Date(a.sent_at).toLocaleDateString() : "Scheduled"}</td>
              </tr>
            ))}
            {!isLoading && !alerts?.length && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No alerts sent yet</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
