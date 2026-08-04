import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Ticket, Plus, Copy, Trash2, Link as LinkIcon } from "lucide-react";

type Code = {
  code: string;
  label: string;
  grant_days: number | null;
  grant_until: string | null;
  max_redemptions: number | null;
  redeemed_count: number;
  starts_at: string;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

type Strategy = "days" | "until";

function randomCode(prefix: string, len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return prefix ? `${prefix}-${out}` : out;
}

export default function AdminCodesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: codes, isLoading } = useQuery({
    queryKey: ["admin-codes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("redemption_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Code[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ code, active }: { code: string; active: boolean }) => {
      const { error } = await (supabase as any)
        .from("redemption_codes")
        .update({ active })
        .eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-codes"] });
      toast.success("Code updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCode = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await (supabase as any)
        .from("redemption_codes")
        .delete()
        .eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-codes"] });
      toast.success("Code deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyShareLink = (code: string) => {
    const url = `${window.location.origin}/onboarding?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase font-axis">
              SUPER ADMIN
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-axis uppercase text-foreground">Redemption Codes.</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Build partner, promo, and event codes that unlock UWAZI+.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New code
        </Button>
      </div>

      <Card className="p-4 md:p-6 overflow-x-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !codes?.length ? (
          <p className="text-muted-foreground text-sm">No codes yet. Click "New code" to create one.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3">Code</th>
                <th className="pb-2 pr-3">Label</th>
                <th className="pb-2 pr-3">Grant</th>
                <th className="pb-2 pr-3">Redeemed</th>
                <th className="pb-2 pr-3">Expires</th>
                <th className="pb-2 pr-3">Active</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.code} className="border-b border-border/50">
                  <td className="py-3 pr-3 font-mono font-bold">{c.code}</td>
                  <td className="py-3 pr-3">{c.label}</td>
                  <td className="py-3 pr-3">
                    {c.grant_until
                      ? `Through ${new Date(c.grant_until).toLocaleDateString()}`
                      : `${c.grant_days} days`}
                  </td>
                  <td className="py-3 pr-3">
                    {c.redeemed_count}
                    {c.max_redemptions ? ` / ${c.max_redemptions}` : ""}
                  </td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <Switch
                      checked={c.active}
                      onCheckedChange={(v) => toggleActive.mutate({ code: c.code, active: v })}
                    />
                  </td>
                  <td className="py-3 flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => copyShareLink(c.code)} title="Copy share link">
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete code ${c.code}? This cannot be undone.`)) {
                          deleteCode.mutate(c.code);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <CreateCodeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["admin-codes"] })}
      />
    </div>
  );
}

function CreateCodeModal({
  open,
  onClose,
  onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [tab, setTab] = useState<"single" | "bulk">("single");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("days");
  const [grantDays, setGrantDays] = useState(90);
  const [grantUntil, setGrantUntil] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkPrefix, setBulkPrefix] = useState("PARTNER");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCode(""); setLabel(""); setStrategy("days"); setGrantDays(90);
    setGrantUntil(""); setMaxRedemptions(""); setExpiresAt("");
    setBulkCount(10); setBulkPrefix("PARTNER"); setTab("single");
  };

  const buildRow = (theCode: string) => ({
    code: theCode.toUpperCase(),
    label: label || theCode.toUpperCase(),
    grant_days: strategy === "days" ? grantDays : null,
    grant_until: strategy === "until" && grantUntil ? new Date(grantUntil).toISOString() : null,
    max_redemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : null,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    active: true,
  });

  const handleCreate = async () => {
    setBusy(true);
    try {
      if (tab === "single") {
        if (!code.trim() || !label.trim()) {
          toast.error("Code and label required");
          setBusy(false);
          return;
        }
        const { error } = await (supabase as any)
          .from("redemption_codes")
          .insert(buildRow(code.trim()));
        if (error) throw error;
        toast.success(`Code ${code.toUpperCase()} created`);
      } else {
        if (!label.trim()) {
          toast.error("Label required for bulk codes");
          setBusy(false);
          return;
        }
        const rows = Array.from({ length: bulkCount }, () => buildRow(randomCode(bulkPrefix)));
        const { error } = await (supabase as any).from("redemption_codes").insert(rows);
        if (error) throw error;
        toast.success(`${bulkCount} codes created`);
      }
      onCreated();
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to create code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create redemption code</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="single">Single code</TabsTrigger>
            <TabsTrigger value="bulk">Bulk generate</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-3 pt-4">
            <div>
              <Label>Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="BACKPACK"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Label (internal)</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Operation Backpack 2026" />
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-3 pt-4">
            <div>
              <Label>Label (shared)</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="NAACP Kansas City" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prefix</Label>
                <Input value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())} />
              </div>
              <div>
                <Label>How many</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(parseInt(e.target.value || "1", 10))}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t border-border pt-4 space-y-3">
          <Label>Pricing strategy</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={strategy === "days" ? "default" : "outline"}
              size="sm"
              onClick={() => setStrategy("days")}
            >
              Time grant
            </Button>
            <Button
              type="button"
              variant={strategy === "until" ? "default" : "outline"}
              size="sm"
              onClick={() => setStrategy("until")}
            >
              Fixed end date
            </Button>
          </div>

          {strategy === "days" ? (
            <div>
              <Label>Days of UWAZI+</Label>
              <Input
                type="number"
                min={1}
                value={grantDays}
                onChange={(e) => setGrantDays(parseInt(e.target.value || "1", 10))}
              />
            </div>
          ) : (
            <div>
              <Label>Access through</Label>
              <Input type="date" value={grantUntil} onChange={(e) => setGrantUntil(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Redemption cap</Label>
              <Input
                type="number"
                placeholder="Unlimited"
                min={1}
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
              />
            </div>
            <div>
              <Label>Code expires</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
