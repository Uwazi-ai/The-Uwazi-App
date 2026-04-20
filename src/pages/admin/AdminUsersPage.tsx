import { useState } from "react";
import { useAllUsers } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Search, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("date");
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { data, isLoading, refetch } = useAllUsers(search, filter, sort, page);
  const queryClient = useQueryClient();

  const filters = [
    { key: "all", label: "All" },
    { key: "active", label: "Active (7d)" },
    { key: "new", label: "New (24h)" },
    { key: "admin", label: "Admin Only" },
  ];

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    await refetch();
  };

  const toggleAdmin = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_admin: !current }).eq("user_id", userId);
    if (error) return toast.error(error.message);
    // Mirror to user_roles for RBAC consistency
    if (!current) {
      await (supabase as any).from("user_roles").insert({ user_id: userId, role: "super_admin" }).select();
    } else {
      await (supabase as any).from("user_roles").delete().eq("user_id", userId).eq("role", "super_admin");
    }
    toast.success(current ? "Super Admin removed — they must refresh to see changes" : "Super Admin granted — they must refresh to see changes");
    invalidateAll();
  };

  const toggleSuspend = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_suspended: !current }).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success(current ? "User unsuspended" : "User suspended");
    invalidateAll();
  };

  const toggleProgramAdmin = async (userId: string, hasRole: boolean) => {
    if (hasRole) {
      const { error } = await (supabase as any)
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "program_admin");
      if (error) return toast.error(error.message);
      toast.success("Program Admin removed — they must refresh to see changes");
    } else {
      const { error } = await (supabase as any)
        .from("user_roles")
        .insert({ user_id: userId, role: "program_admin" });
      if (error) return toast.error(error.message);
      toast.success("Program Admin granted — they must refresh to see changes");
    }
    invalidateAll();
  };

  const exportCSV = () => {
    if (!data?.users.length) return;
    const headers = ["Name", "Email", "ZIP", "Admin", "Joined"];
    const rows = data.users.map(u => [u.display_name, "", u.zip_code, u.is_admin, u.created_at]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uwazi-users.csv";
    a.click();
  };

  const totalPages = Math.ceil((data?.total || 0) / 25);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase font-axis">SUPER ADMIN</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-axis uppercase text-foreground">ALL USERS</h1>
        <p className="text-muted-foreground mt-1">Manage, view, and analyze every UWAZI account</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or ZIP..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 bg-card border-border" />
        </div>
        <div className="flex gap-1">
          {filters.map(f => (
            <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => { setFilter(f.key); setPage(0); }} className="text-xs">
              {f.label}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} className="text-xs gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <Card className="bg-card border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-3 font-medium">User</th>
              <th className="p-3 font-medium hidden md:table-cell">ZIP</th>
              <th className="p-3 font-medium hidden lg:table-cell">Joined</th>
              <th className="p-3 font-medium hidden md:table-cell">Admin</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="p-3" colSpan={5}><Skeleton className="h-6 w-full" /></td>
              </tr>
            ))}
            {data?.users.map(u => {
              const isProgramAdmin = (u as any).roles?.includes("program_admin");
              return (
              <tr key={u.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} className="h-full w-full object-cover" /> : u.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-xs flex items-center gap-1 flex-wrap">
                        {u.display_name || "Unknown"}
                        {u.is_admin && <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded font-axis">SUPER</span>}
                        {isProgramAdmin && <span className="bg-accent/20 text-accent-foreground text-[9px] px-1.5 py-0.5 rounded font-axis">PROGRAM</span>}
                        {u.is_suspended && <span className="bg-destructive/20 text-destructive text-[9px] px-1.5 py-0.5 rounded">SUSPENDED</span>}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{u.zip_code ? `📍 ${u.zip_code}` : "—"}</td>
                <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3 hidden md:table-cell">{u.is_admin ? <span className="text-primary text-xs">✓</span> : <span className="text-muted-foreground text-xs">—</span>}</td>
                <td className="p-3">
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="outline" className="text-[10px] h-7 px-2" onClick={() => setSelectedUser(u)}>View</Button>
                    <Button size="sm" variant="outline" className="text-[10px] h-7 px-2" onClick={() => toggleAdmin(u.user_id, u.is_admin ?? false)}>
                      {u.is_admin ? "Remove Super" : "Make Super"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-[10px] h-7 px-2" onClick={() => toggleProgramAdmin(u.user_id, isProgramAdmin)}>
                      {isProgramAdmin ? "Remove Program" : "Make Program"}
                    </Button>
                    <Button size="sm" variant={u.is_suspended ? "outline" : "destructive"} className="text-[10px] h-7 px-2" onClick={() => toggleSuspend(u.user_id, u.is_suspended ?? false)}>
                      {u.is_suspended ? "Unsuspend" : "Suspend"}
                    </Button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && !data?.users.length && (
          <div className="p-8 text-center text-muted-foreground text-sm">No users found</div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-xs text-muted-foreground self-center">Page {page + 1} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent className="bg-card border-border overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-axis text-foreground">{selectedUser?.display_name || "User Details"}</SheetTitle>
          </SheetHeader>
          {selectedUser && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold mx-auto overflow-hidden">
                {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="h-full w-full object-cover" /> : selectedUser.display_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="space-y-2">
                <Row label="Name" value={selectedUser.display_name} />
                <Row label="ZIP Code" value={selectedUser.zip_code} />
                <Row label="District" value={selectedUser.district} />
                <Row label="Knowledge Level" value={selectedUser.civic_knowledge_level} />
                <Row label="Admin" value={selectedUser.is_admin ? "Yes" : "No"} />
                <Row label="Suspended" value={selectedUser.is_suspended ? "Yes" : "No"} />
                <Row label="Onboarding" value={selectedUser.onboarding_complete ? "Complete" : "Incomplete"} />
                <Row label="Joined" value={new Date(selectedUser.created_at).toLocaleDateString()} />
                <Row label="Last Active" value={selectedUser.last_active ? new Date(selectedUser.last_active).toLocaleDateString() : "—"} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value || "—"}</span>
    </div>
  );
}
