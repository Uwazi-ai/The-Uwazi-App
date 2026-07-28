import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Ticket, TrendingUp, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";

type CodeStat = {
  code: string;
  label: string;
  active: boolean;
  max_redemptions: number | null;
  redeemed_count: number;
  first_redemption: string | null;
  last_redemption: string | null;
  early_signups: number;
};

export function RedemptionCodesSection() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["code-redemption-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("code_redemption_stats");
      if (error) throw error;
      return (data ?? []) as CodeStat[];
    },
  });

  const { data: chart } = useQuery({
    queryKey: ["code-redemptions-by-day"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("code_redemptions_by_day", { period_days: 30 });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        date: new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        count: Number(r.count),
      }));
    },
  });

  const totalRedeemed = stats?.reduce((s, c) => s + (c.redeemed_count || 0), 0) ?? 0;
  const activeCount = stats?.filter((c) => c.active).length ?? 0;
  const earlySignups = stats?.reduce((s, c) => s + Number(c.early_signups || 0), 0) ?? 0;

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-axis uppercase">Redemption Codes</h2>
            <p className="text-xs text-muted-foreground">Partner + promo code performance</p>
          </div>
        </div>
        <Link
          to="/app/admin/codes"
          className="text-xs text-primary hover:underline"
        >
          Manage codes →
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KPI icon={TrendingUp} label="Total redemptions" value={totalRedeemed} />
            <KPI icon={Users} label="Early signups (<24h)" value={earlySignups} />
            <KPI icon={Zap} label="Active codes" value={activeCount} />
          </div>

          {chart && chart.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#666" fontSize={11} />
                  <YAxis stroke="#666" fontSize={11} allowDecimals={false} />
                  <RTooltip
                    contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#9bd34b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {stats && stats.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                    <th className="pb-2 pr-3">Code</th>
                    <th className="pb-2 pr-3">Label</th>
                    <th className="pb-2 pr-3">Redeemed</th>
                    <th className="pb-2 pr-3">Early signups</th>
                    <th className="pb-2 pr-3">Last used</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.code} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-mono font-bold">{s.code}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{s.label}</td>
                      <td className="py-2 pr-3">
                        {s.redeemed_count}{s.max_redemptions ? ` / ${s.max_redemptions}` : ""}
                      </td>
                      <td className="py-2 pr-3">{Number(s.early_signups)}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {s.last_redemption ? new Date(s.last_redemption).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function KPI({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}
