import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cpu, CheckCircle2, XCircle } from "lucide-react";

type LogRow = {
  id: string;
  created_at: string;
  model_id: string | null;
  model_source: string;
  success: boolean;
  error_type: string | null;
  error_message: string | null;
  upstream_status: number | null;
  tools_used: string[] | null;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number | null;
};

const MODEL_LABELS: Record<string, string> = {
  "claude-haiku-4-5-20251001": "Haiku 4.5",
  "claude-sonnet-5": "Sonnet 5",
  "claude-opus-5": "Opus 5",
};

export function AskModelLogSection() {
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["ask-model-log", filter],
    queryFn: async () => {
      let q = supabase
        .from("ask_uwazi_model_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "all") q = q.eq("success", filter === "success");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
    refetchInterval: 60000,
  });

  const rows = data ?? [];
  const total = rows.length;
  const failures = rows.filter((r) => !r.success).length;

  const byModel = rows.reduce<Record<string, { ok: number; fail: number }>>((acc, r) => {
    const key = r.model_id ?? "unknown";
    acc[key] ??= { ok: 0, fail: 0 };
    if (r.success) acc[key].ok += 1;
    else acc[key].fail += 1;
    return acc;
  }, {});

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Cpu className="h-5 w-5 text-primary" />
          Ask UWAZI Model Log
        </h2>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All chats</SelectItem>
            <SelectItem value="success">Succeeded</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Recent chats</p>
              <p className="text-2xl font-semibold">{total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Failures</p>
              <p className="text-2xl font-semibold text-destructive">{failures}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Success rate</p>
              <p className="text-2xl font-semibold">
                {total ? Math.round(((total - failures) / total) * 100) : 0}%
              </p>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(byModel).map(([model, c]) => (
              <Badge key={model} variant="secondary" className="gap-2">
                {MODEL_LABELS[model] ?? model}
                <span className="text-emerald-500">{c.ok} ok</span>
                {c.fail > 0 && <span className="text-destructive">{c.fail} fail</span>}
              </Badge>
            ))}
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2">Tokens</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      No chat activity logged yet.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">
                      {MODEL_LABELS[r.model_id ?? ""] ?? r.model_id ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.model_source === "admin_override" ? "Admin override" : "Auto"}
                    </td>
                    <td className="px-3 py-2">
                      {r.success ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="h-4 w-4" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <XCircle className="h-4 w-4" /> Failed
                          {r.upstream_status ? ` (${r.upstream_status})` : ""}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {r.input_tokens}/{r.output_tokens}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-muted-foreground">
                      {r.success
                        ? (r.tools_used ?? []).join(", ") || "—"
                        : `${r.error_type ?? "error"}: ${r.error_message ?? ""}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </section>
  );
}
