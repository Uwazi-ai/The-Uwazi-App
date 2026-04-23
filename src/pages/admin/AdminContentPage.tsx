import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminContentPage() {
  const { data: elections, isLoading: eLoading } = useQuery({
    queryKey: ["admin-elections"],
    queryFn: async () => {
      const { data } = await supabase.from("elections").select("*").order("election_date", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: candidates, isLoading: cLoading } = useQuery({
    queryKey: ["admin-candidates"],
    queryFn: async () => {
      const { data } = await supabase.from("candidates").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: likedEpisodes, isLoading: lLoading } = useQuery({
    queryKey: ["admin-episode-likes"],
    queryFn: async () => {
      // Fetch all likes + join episode metadata, then aggregate client-side
      const { data: likes } = await supabase
        .from("episode_likes")
        .select("episode_id, user_id, created_at");
      const { data: eps } = await supabase
        .from("episodes")
        .select("id, title, topic, topic_emoji");

      const epMap = new Map((eps || []).map((e) => [e.id, e]));
      const counts = new Map<string, { count: number; users: Set<string>; latest: string }>();
      (likes || []).forEach((l) => {
        const cur = counts.get(l.episode_id) || { count: 0, users: new Set(), latest: l.created_at };
        cur.count += 1;
        cur.users.add(l.user_id);
        if (l.created_at > cur.latest) cur.latest = l.created_at;
        counts.set(l.episode_id, cur);
      });
      return Array.from(counts.entries())
        .map(([episode_id, v]) => ({
          episode_id,
          count: v.count,
          unique_users: v.users.size,
          latest: v.latest,
          episode: epMap.get(episode_id),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 25);
    },
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase font-axis">SUPER ADMIN</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-axis uppercase text-foreground">CIVIC CONTENT</h1>
        <p className="text-muted-foreground mt-1">Elections, candidates, and ballot data</p>
      </div>

      <Card className="bg-card border-border p-4">
        <h3 className="text-sm font-axis uppercase text-foreground mb-3">ELECTIONS</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-2 font-medium">Type</th>
              <th className="p-2 font-medium">Jurisdiction</th>
              <th className="p-2 font-medium">Date</th>
              <th className="p-2 font-medium hidden md:table-cell">Reg. Deadline</th>
            </tr>
          </thead>
          <tbody>
            {eLoading && <tr><td colSpan={4} className="p-3"><Skeleton className="h-6" /></td></tr>}
            {elections?.map(e => (
              <tr key={e.id} className="border-b border-border hover:bg-primary/5">
                <td className="p-2 text-foreground capitalize">{e.type}</td>
                <td className="p-2 text-muted-foreground">{e.jurisdiction}</td>
                <td className="p-2 text-primary">{e.election_date}</td>
                <td className="p-2 text-muted-foreground hidden md:table-cell">{e.registration_deadline || "—"}</td>
              </tr>
            ))}
            {!eLoading && !elections?.length && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No elections yet</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="bg-card border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="h-4 w-4 text-red-500 fill-red-500" />
          <h3 className="text-sm font-axis uppercase text-foreground">MOST LIKED EPISODES</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-2 font-medium">Episode</th>
              <th className="p-2 font-medium hidden md:table-cell">Topic</th>
              <th className="p-2 font-medium text-right">Likes</th>
              <th className="p-2 font-medium text-right hidden md:table-cell">Unique Users</th>
              <th className="p-2 font-medium hidden lg:table-cell">Latest</th>
            </tr>
          </thead>
          <tbody>
            {lLoading && <tr><td colSpan={5} className="p-3"><Skeleton className="h-6" /></td></tr>}
            {likedEpisodes?.map((row) => (
              <tr key={row.episode_id} className="border-b border-border hover:bg-primary/5">
                <td className="p-2 text-foreground">{row.episode?.title || row.episode_id}</td>
                <td className="p-2 text-muted-foreground hidden md:table-cell">
                  {row.episode?.topic_emoji} {row.episode?.topic || "—"}
                </td>
                <td className="p-2 text-right">
                  <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                    <Heart size={12} className="fill-red-500" /> {row.count}
                  </span>
                </td>
                <td className="p-2 text-right text-muted-foreground hidden md:table-cell">{row.unique_users}</td>
                <td className="p-2 text-muted-foreground hidden lg:table-cell text-xs">
                  {new Date(row.latest).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {!lLoading && !likedEpisodes?.length && (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No likes yet</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="bg-card border-border p-4">
        <h3 className="text-sm font-axis uppercase text-foreground mb-3">CANDIDATES</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-2 font-medium">Name</th>
              <th className="p-2 font-medium">Office</th>
              <th className="p-2 font-medium hidden md:table-cell">Party</th>
              <th className="p-2 font-medium hidden md:table-cell">District</th>
            </tr>
          </thead>
          <tbody>
            {cLoading && <tr><td colSpan={4} className="p-3"><Skeleton className="h-6" /></td></tr>}
            {candidates?.map(c => (
              <tr key={c.id} className="border-b border-border hover:bg-primary/5">
                <td className="p-2 text-foreground">{c.name}</td>
                <td className="p-2 text-muted-foreground">{c.office}</td>
                <td className="p-2 text-muted-foreground hidden md:table-cell">{c.party || "—"}</td>
                <td className="p-2 text-muted-foreground hidden md:table-cell">{c.district || "—"}</td>
              </tr>
            ))}
            {!cLoading && !candidates?.length && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No candidates yet</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
