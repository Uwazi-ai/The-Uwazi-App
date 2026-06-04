import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, RefreshCw, ExternalLink } from "lucide-react";

type SEOStatus = {
  site_url: string;
  connected: boolean;
  lovable_api_key_present: boolean;
  gsc_api_key_present: boolean;
  site_in_console: boolean;
  permission_level?: string;
  verified: boolean;
  verification: unknown;
  sites: unknown;
  errors: string[];
};

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      {ok ? (
        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {detail && <div className="text-xs text-muted-foreground mt-0.5 break-all">{detail}</div>}
      </div>
      <Badge variant={ok ? "default" : "destructive"}>{ok ? "OK" : "Missing"}</Badge>
    </div>
  );
}

export default function AdminSEOPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["seo-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<SEOStatus>("seo-status");
      if (error) throw error;
      return data!;
    },
  });

  return (
    <div className="container max-w-3xl py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">SEO Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Google Search Console connection & site verification
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-6 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-3/4" />
        </Card>
      ) : data ? (
        <>
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Connection
            </h2>
            <StatusRow ok={data.lovable_api_key_present} label="LOVABLE_API_KEY configured" />
            <StatusRow
              ok={data.gsc_api_key_present}
              label="Google Search Console connected"
              detail={data.gsc_api_key_present ? "Connector linked" : "Link via Cloud connectors"}
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Site Verification (META)
            </h2>
            <StatusRow
              ok={data.verified}
              label="Site ownership verified"
              detail={data.site_url}
            />
            <StatusRow
              ok={data.site_in_console}
              label="Registered in Search Console"
              detail={data.permission_level ? `Permission: ${data.permission_level}` : undefined}
            />
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
            >
              Open Search Console <ExternalLink className="w-3 h-3" />
            </a>
          </Card>

          {data.errors?.length > 0 && (
            <Card className="p-6 border-destructive/40">
              <h2 className="text-sm font-semibold text-destructive uppercase tracking-wide mb-2">
                Errors
              </h2>
              <ul className="text-xs text-muted-foreground space-y-1 font-mono">
                {data.errors.map((e, i) => (
                  <li key={i} className="break-all">{e}</li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Raw Response
            </h2>
            <pre className="text-[11px] text-muted-foreground overflow-auto max-h-80 p-3 rounded-md bg-muted">
              {JSON.stringify(data, null, 2)}
            </pre>
          </Card>
        </>
      ) : (
        <Card className="p-6 text-sm text-muted-foreground">Failed to load status.</Card>
      )}
    </div>
  );
}
