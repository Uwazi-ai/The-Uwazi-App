import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Copy, Share2, Lock, Trophy, Medal, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ORG_BADGES = [
  { id: "first-10", name: "First 10", desc: "10+ registrations referred", threshold: 10, field: "registrations" },
  { id: "streak", name: "Registration Streak", desc: "Active 4 weeks in a row", threshold: 4, field: "streak_weeks" },
  { id: "depth", name: "Depth Over Numbers", desc: "50%+ of referrals completed a lesson", threshold: 50, field: "lesson_pct" },
  { id: "voter-verified", name: "Voter Verified", desc: "25+ verified voters", threshold: 25, field: "verified_votes" },
  { id: "city-champ", name: "City Champion", desc: "#1 in their metro", threshold: 1, field: "city_rank" },
];

export default function PartnerDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [leaderView, setLeaderView] = useState<"national" | "city" | "category">("national");

  // Get user's org membership
  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ["my-org-membership", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("org_members" as any)
        .select("*, partner_orgs:org_id(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      return data as any;
    },
    enabled: !!user,
  });

  const org = membership?.partner_orgs;
  const isOrgAdmin = membership?.role === "admin";

  // Impact stats
  const { data: impactStats } = useQuery({
    queryKey: ["org-impact", org?.id],
    queryFn: async () => {
      if (!org) return null;
      const [{ count: totalRegs }, { count: signups }] = await Promise.all([
        supabase.from("org_registrations" as any).select("*", { count: "exact", head: true }).eq("org_id", org.id),
        supabase.from("org_registrations" as any).select("*", { count: "exact", head: true }).eq("org_id", org.id).eq("event_type", "uwazi_signup"),
      ]);
      return {
        registrations: totalRegs || 0,
        signups: signups || 0,
        activeLearners: 0, // TODO: calculate from lesson_progress
        civicScore: org.civic_impact_score || 0,
      };
    },
    enabled: !!org,
  });

  // Team members
  const { data: teamMembers } = useQuery({
    queryKey: ["org-team", org?.id],
    queryFn: async () => {
      if (!org) return [];
      const { data } = await supabase
        .from("org_members" as any)
        .select("*, profiles:user_id(display_name, avatar_url)")
        .eq("org_id", org.id)
        .neq("status", "removed");
      return (data || []) as any[];
    },
    enabled: !!org,
  });

  // Pending invites
  const { data: pendingInvites } = useQuery({
    queryKey: ["org-invites", org?.id],
    queryFn: async () => {
      if (!org) return [];
      const { data } = await supabase
        .from("org_invites" as any)
        .select("*")
        .eq("org_id", org.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!org && isOrgAdmin,
  });

  // Leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ["org-leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_orgs" as any)
        .select("*")
        .eq("is_active", true)
        .order("civic_impact_score", { ascending: false });
      return (data || []) as any[];
    },
  });

  // Search existing users
  const { data: searchResults } = useQuery({
    queryKey: ["org-user-search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .or(`display_name.ilike.%${searchQuery}%`)
        .limit(10);
      return (data || []) as any[];
    },
    enabled: searchQuery.length >= 2,
  });

  // Invite by email
  const inviteMutation = useMutation({
    mutationFn: async () => {
      const token = crypto.randomUUID();
      const { error } = await supabase.from("org_invites" as any).insert({
        org_id: org.id,
        email: inviteEmail.trim(),
        token,
        role: "member",
        invited_by: user?.id,
      });
      if (error) throw error;
      return token;
    },
    onSuccess: (token) => {
      queryClient.invalidateQueries({ queryKey: ["org-invites"] });
      const link = `https://uwaziapp.uwazi.ai/join?org=${org.slug}&token=${token}`;
      navigator.clipboard.writeText(link);
      toast.success("Invite created! Link copied to clipboard.");
      setInviteEmail("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Add existing user
  const addUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error: memberError } = await supabase.from("org_members" as any).upsert({
        org_id: org.id,
        user_id: targetUserId,
        role: "member",
        status: "active",
        invited_by: user?.id,
      }, { onConflict: "org_id,user_id" });
      if (memberError) throw memberError;
      await (supabase.from("profiles") as any).update({ org_role: "org_member" }).eq("user_id", targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-team"] });
      setSearchQuery("");
      toast.success("Member added to your team");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update member role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase.from("org_members" as any).update({ role: newRole }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-team"] });
      toast.success("Role updated");
    },
  });

  // Remove member
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("org_members" as any).update({ status: "removed" }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-team"] });
      toast.success("Member removed");
    },
  });

  // Revoke invite
  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.from("org_invites" as any).delete().eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-invites"] });
      toast.success("Invite revoked");
    },
  });

  if (membershipLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-semibold text-lg">Loading...</div>
      </div>
    );
  }

  if (!membership) {
    return <Navigate to="/app" replace />;
  }




  const filteredLeaderboard = leaderboard?.filter((o: any) => {
    if (leaderView === "city") return o.city === org?.city;
    if (leaderView === "category") return o.category === org?.category;
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <div className="border-b border-border px-4 md:px-8 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center gap-3">
          {org?.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-axis text-lg">
              {org?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-axis text-foreground">{org?.name}</h1>
            <p className="text-xs text-muted-foreground">Partner Dashboard</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-4 md:p-8">
        <Tabs defaultValue="impact" className="space-y-6">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="impact">Impact</TabsTrigger>
            {isOrgAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* IMPACT TAB */}
          <TabsContent value="impact" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4 text-center">
                <p className="text-4xl md:text-5xl font-axis text-foreground">{impactStats?.registrations || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Registrations</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-4xl md:text-5xl font-axis text-foreground">{impactStats?.signups || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">UWAZI Signups</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-4xl md:text-5xl font-axis text-foreground">{impactStats?.activeLearners || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Active Learners</p>
              </Card>
              <Card className="p-4 text-center border-primary/30">
                <p className="text-4xl md:text-5xl font-axis text-primary">{impactStats?.civicScore || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Civic Impact Score</p>
              </Card>
            </motion.div>

            {/* Referral Link */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="p-6">
                <h3 className="text-sm font-axis uppercase mb-3">YOUR REFERRAL LINK</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-background p-3 rounded-lg border border-border truncate">
                    uwaziapp.uwazi.ai/vote?org={org?.slug}
                  </code>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://uwaziapp.uwazi.ai/vote?org=${org?.slug}`);
                      toast.success("Link copied!");
                    }}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" /> Copy
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: `Join ${org?.name} on UWAZI`, url: `https://uwaziapp.uwazi.ai/vote?org=${org?.slug}` });
                      } else {
                        navigator.clipboard.writeText(`https://uwaziapp.uwazi.ai/vote?org=${org?.slug}`);
                        toast.success("Link copied!");
                      }
                    }}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Badges */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h3 className="text-sm font-axis uppercase mb-3">ORG BADGES</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {ORG_BADGES.map((badge) => {
                  const earned = badge.field === "registrations" && (impactStats?.registrations || 0) >= badge.threshold;
                  return (
                    <Card key={badge.id} className={`p-4 text-center transition-all ${earned ? "border-primary/40" : "opacity-50"}`}>
                      <div className={`text-3xl mb-2 ${earned ? "" : "grayscale"}`}>
                        {earned ? <Trophy className="h-8 w-8 text-primary mx-auto" /> : <Lock className="h-8 w-8 text-muted-foreground mx-auto" />}
                      </div>
                      <p className="text-xs font-medium">{badge.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{badge.desc}</p>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          </TabsContent>

          {/* TEAM TAB */}
          {isOrgAdmin && (
            <TabsContent value="team" className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="text-sm font-axis uppercase mb-3">CURRENT MEMBERS</h3>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers?.map((m: any) => (
                          <TableRow key={m.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                  {m.profiles?.display_name?.[0]?.toUpperCase() || "?"}
                                </div>
                                {m.profiles?.display_name || "Unknown"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={m.role}
                                onValueChange={(v) => updateRoleMutation.mutate({ memberId: m.id, newRole: v })}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(m.joined_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => removeMemberMutation.mutate(m.id)}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </motion.div>

              {/* Invite Section */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <h3 className="text-sm font-axis uppercase mb-3">INVITE MEMBERS</h3>

                {/* Invite by email */}
                <Card className="p-4 mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Invite by Email</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <Button
                      onClick={() => inviteMutation.mutate()}
                      disabled={!inviteEmail.trim() || inviteMutation.isPending}
                      className="gap-1"
                    >
                      <UserPlus className="h-4 w-4" /> Send Invite
                    </Button>
                  </div>
                </Card>

                {/* Pending invites */}
                {(pendingInvites?.length || 0) > 0 && (
                  <Card className="p-4 mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Pending Invites</p>
                    <div className="space-y-2">
                      {pendingInvites?.map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between p-2 rounded border border-border">
                          <div>
                            <p className="text-sm">{inv.email}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Expires {new Date(inv.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => revokeInviteMutation.mutate(inv.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Add existing user */}
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">Add Existing UWAZI User</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {searchResults && searchResults.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {searchResults.map((u: any) => (
                        <button
                          key={u.user_id}
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left transition-colors"
                          onClick={() => addUserMutation.mutate(u.user_id)}
                        >
                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                            {u.display_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="text-sm">{u.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            </TabsContent>
          )}

          {/* LEADERBOARD TAB */}
          <TabsContent value="leaderboard" className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex gap-2 mb-4">
                {(["national", "city", "category"] as const).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={leaderView === v ? "default" : "outline"}
                    onClick={() => setLeaderView(v)}
                    className="capitalize"
                  >
                    {v === "national" ? "National" : v === "city" ? "Your City" : "Your Category"}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                {filteredLeaderboard.map((o: any, i: number) => {
                  const isMe = o.id === org?.id;
                  return (
                    <Card
                      key={o.id}
                      className={`p-4 flex items-center gap-4 transition-all ${isMe ? "border-l-4 border-l-primary" : ""}`}
                    >
                      <div className="text-center w-8">
                        {i < 3 ? (
                          <Medal className={`h-6 w-6 mx-auto ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : "text-amber-600"}`} />
                        ) : (
                          <span className="text-lg font-axis text-muted-foreground">#{i + 1}</span>
                        )}
                      </div>
                      {o.logo_url ? (
                        <img src={o.logo_url} alt={o.name} className="h-10 w-10 rounded-xl object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-axis">
                          {o.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{o.name}</p>
                        <p className="text-xs text-muted-foreground">{o.city || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-axis text-primary">{o.civic_impact_score || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Civic Impact</p>
                      </div>
                    </Card>
                  );
                })}
                {!filteredLeaderboard.length && (
                  <p className="text-center text-muted-foreground py-8">No organizations yet</p>
                )}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
