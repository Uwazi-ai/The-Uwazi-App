import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useRecentSignups, useTopScores, useZipBreakdown } from "@/hooks/useAdminData";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function Status({ loading, error, empty }: { loading: boolean; error: boolean; empty: boolean }) {
  if (loading) return <Skeleton className="h-32 w-full" />;
  if (error) return <p role="alert" className="text-sm text-destructive">We could not load this list. Use Refresh to try again.</p>;
  if (empty) return <p className="text-sm text-muted-foreground">No data yet.</p>;
  return null;
}

export function OverviewRecentSignups() {
  const query = useRecentSignups();
  return <Card className="rounded-lg p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold text-foreground">Recent signups</h3>
      <Button asChild variant="outline" size="sm"><Link to="/app/admin/users">View all users<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
    </div>
    <Status loading={query.isLoading} error={query.isError} empty={!query.data?.length} />
    {!query.isError && <div className="grid gap-x-6 md:grid-cols-2">{query.data?.map((user) => {
      const days = Math.max(0, Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000));
      return <div key={user.user_id} className="flex items-center gap-3 border-b border-border py-3">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold"><AdminAvatar src={user.avatar_url} fallback={user.display_name?.[0]?.toUpperCase() || "?"} /></div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{user.display_name || "Unknown"}</p><p className="text-xs text-muted-foreground">{user.zip_code ? `ZIP ${user.zip_code} · ` : ""}{days === 0 ? "Today" : `${days} days ago`}</p></div>
      </div>;
    })}</div>}
  </Card>;
}

export function OverviewTopScores() {
  const query = useTopScores();
  return <Card className="rounded-lg p-5 space-y-4">
    <h3 className="font-semibold text-foreground">Top civic scores</h3>
    <Status loading={query.isLoading} error={query.isError} empty={!query.data?.length} />
    {!query.isError && query.data?.map((person) => <div key={person.rank} className="flex items-center gap-3 py-2">
      <span className="w-8 shrink-0 font-axis text-primary">#{person.rank}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm text-foreground">{person.name}</p><div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, person.score))}%` }} /></div></div>
      <div className="shrink-0 text-right"><p className="text-sm text-foreground">{person.score}</p><p className="text-xs text-muted-foreground">{person.xp.toLocaleString()} XP</p></div>
    </div>)}
  </Card>;
}

export function OverviewZipBreakdown() {
  const query = useZipBreakdown();
  return <Card className="rounded-lg p-5 space-y-4">
    <h3 className="font-semibold text-foreground">ZIP breakdown</h3>
    <Status loading={query.isLoading} error={query.isError} empty={!query.data?.length} />
    {!query.isError && query.data?.map((area) => <div key={area.zip} className="flex items-center gap-3 py-2">
      <span className="w-14 shrink-0 font-mono text-sm text-primary">{area.zip}</span>
      <div className="h-2 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, area.count / (query.data?.[0]?.count || 1) * 100)}%` }} /></div>
      <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{area.count} users</span>
    </div>)}
  </Card>;
}