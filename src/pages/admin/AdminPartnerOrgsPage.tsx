import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Shield, Plus, Copy, Search, Users, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const CATEGORIES = ["faith", "hbcu", "nonprofit", "union", "youth", "government", "other"] as const;

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminPartnerOrgsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newOrg, setNewOrg] = useState({ name: "", slug: "", city: "", category: "nonprofit", logo_url: "" });

  // Fetch all orgs
  const { data: orgs, isLoading } = useQuery({
    queryKey: ["admin-partner-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_orgs" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch members for selected org
  const { data: orgMembers } = useQuery({
    queryKey: ["admin-org-members", selectedOrg?.id],
    queryFn: async () => {
      if (!selectedOrg) return [];
      const { data, error } = await supabase
        .from("org_members" as any)
        .select("*, profiles:user_id(display_name, avatar_url)")
        .eq("org_id", selectedOrg.id)
        .neq("status", "removed");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedOrg,
  });

  // Fetch org registrations count
  const { data: orgStats } = useQuery({
    queryKey: ["admin-org-stats", selectedOrg?.id],
    queryFn: async () => {
      if (!selectedOrg) return null;
      const { count: registrations } = await supabase
        .from("org_registrations" as any)
        .select("*", { count: "exact", head: true })
        .eq("org_id", selectedOrg.id);
      const { count: signups } = await supabase
        .from("org_registrations" as any)
        .select("*", { count: "exact", head: true })
        .eq("org_id", selectedOrg.id)
        .eq("event_type", "uwazi_signup");
      return { registrations: registrations || 0, signups: signups || 0 };
    },
    enabled: !!selectedOrg,
  });

  // Search users for assign admin
  const { data: searchResults } = useQuery({
    queryKey: ["admin-user-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .or(`display_name.ilike.%${searchQuery}%`)
        .limit(10);
      return data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Create org mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partner_orgs" as any).insert({
        name: newOrg.name,
        slug: newOrg.slug,
        city: newOrg.city || null,
        category: newOrg.category,
        logo_url: newOrg.logo_url || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partner-orgs"] });
      setCreateOpen(false);
      setNewOrg({ name: "", slug: "", city: "", category: "nonprofit", logo_url: "" });
      toast.success("Organization created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("partner_orgs" as any)
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partner-orgs"] });
      if (selectedOrg) {
        setSelectedOrg((prev: any) => prev ? { ...prev, is_active: !prev.is_active } : null);
      }
      toast.success("Status updated");
    },
  });

  // Assign org admin mutation
  const assignAdminMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      // Add to org_members
      const { error: memberError } = await supabase.from("org_members" as any).upsert({
        org_id: selectedOrg.id,
        user_id: targetUserId,
        role: "admin",
        status: "active",
        invited_by: user?.id,
      }, { onConflict: "org_id,user_id" });
      if (memberError) throw memberError;

      // Update profile org_role via raw fetch (SDK strips untyped keys)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${targetUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token}`, Prefer: "return=minimal" },
        body: JSON.stringify({ org_role: "org_admin" }),
      });
      if (!resp.ok) throw new Error("Failed to set org_role");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-org-members"] });
      setAssignOpen(false);
      setSearchQuery("");
      toast.success("Org admin assigned");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Get member count per org
  const { data: memberCounts } = useQuery({
    queryKey: ["admin-org-member-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("org_members" as any)
        .select("org_id")
        .eq("status", "active");
      const counts: Record<string, number> = {};
      (data || []).forEach((m: any) => {
        counts[m.org_id] = (counts[m.org_id] || 0) + 1;
      });
      return counts;
    },
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase font-axis">PARTNER ORGS</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-axis uppercase text-foreground">PARTNER ORGANIZATIONS</h1>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create New Org
          </Button>
        </div>
      </motion.div>

      {/* Orgs Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Org Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Civic Impact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell>
                  </TableRow>
                ) : !orgs?.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No partner organizations yet</TableCell>
                  </TableRow>
                ) : orgs.map((org: any) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedOrg(org)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {org.logo_url ? (
                          <img src={org.logo_url} alt={org.name} className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-axis text-sm">
                            {org.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        {org.name}
                      </div>
                    </TableCell>
                    <TableCell>{org.city || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{org.category || "other"}</Badge>
                    </TableCell>
                    <TableCell>{memberCounts?.[org.id] || 0}</TableCell>
                    <TableCell className="font-axis text-primary">{org.civic_impact_score || 0}</TableCell>
                    <TableCell>
                      <Badge variant={org.is_active ? "default" : "secondary"}>
                        {org.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActiveMutation.mutate({ id: org.id, is_active: org.is_active });
                        }}
                      >
                        {org.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </motion.div>

      {/* Create Org Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-axis">CREATE NEW ORGANIZATION</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Org Name</Label>
              <Input
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value, slug: slugify(e.target.value) })}
                placeholder="e.g. NAACP KC"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={newOrg.slug}
                onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })}
                placeholder="e.g. naacp-kc"
              />
              <p className="text-xs text-muted-foreground">Used in referral URLs</p>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={newOrg.city}
                onChange={(e) => setNewOrg({ ...newOrg, city: e.target.value })}
                placeholder="e.g. Kansas City"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newOrg.category} onValueChange={(v) => setNewOrg({ ...newOrg, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Logo URL (optional)</Label>
              <Input
                value={newOrg.logo_url}
                onChange={(e) => setNewOrg({ ...newOrg, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newOrg.name || !newOrg.slug || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Org Detail Side Panel */}
      <Sheet open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedOrg && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  {selectedOrg.logo_url ? (
                    <img src={selectedOrg.logo_url} alt={selectedOrg.name} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-axis text-xl">
                      {selectedOrg.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <SheetTitle className="font-axis text-xl">{selectedOrg.name}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{selectedOrg.city} · <span className="capitalize">{selectedOrg.category}</span></p>
                  </div>
                </div>
              </SheetHeader>

              {/* Referral Link */}
              <Card className="p-4">
                <Label className="text-xs text-muted-foreground">Referral Link</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-background p-2 rounded border border-border truncate">
                    uwaziapp.uwazi.ai/impact?org={selectedOrg.slug}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://uwaziapp.uwazi.ai/impact?org=${selectedOrg.slug}`);
                      toast.success("Link copied!");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-axis text-foreground">{orgStats?.registrations || 0}</p>
                  <p className="text-xs text-muted-foreground">Registrations</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-axis text-foreground">{orgStats?.signups || 0}</p>
                  <p className="text-xs text-muted-foreground">Signups</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-axis text-primary">{selectedOrg.civic_impact_score || 0}</p>
                  <p className="text-xs text-muted-foreground">Civic Impact Score</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-axis text-foreground">{orgMembers?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Members</p>
                </Card>
              </div>

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-axis uppercase">MEMBERS</h3>
                  <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} className="gap-1">
                    <Users className="h-3 w-3" /> Assign Org Admin
                  </Button>
                </div>
                <div className="space-y-2">
                  {orgMembers?.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {m.profiles?.display_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{m.profiles?.display_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground capitalize">{m.role} · {new Date(m.joined_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge variant={m.role === "admin" ? "default" : "secondary"} className="capitalize">{m.role}</Badge>
                    </div>
                  ))}
                  {!orgMembers?.length && <p className="text-sm text-muted-foreground">No members yet</p>}
                </div>
              </div>

              {/* Toggle active */}
              <Button
                variant={selectedOrg.is_active ? "destructive" : "default"}
                className="w-full"
                onClick={() => toggleActiveMutation.mutate({ id: selectedOrg.id, is_active: selectedOrg.is_active })}
              >
                {selectedOrg.is_active ? "Deactivate Org" : "Activate Org"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Assign Admin Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-axis">ASSIGN ORG ADMIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search users by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults?.map((u: any) => (
                <button
                  key={u.user_id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                  onClick={() => assignAdminMutation.mutate(u.user_id)}
                  disabled={assignAdminMutation.isPending}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                    {u.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <p className="text-sm font-medium">{u.display_name || "Unknown"}</p>
                </button>
              ))}
              {searchQuery.length >= 2 && !searchResults?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
