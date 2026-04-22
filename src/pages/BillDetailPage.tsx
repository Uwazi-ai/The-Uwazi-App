import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, AlertCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizeCongressBill,
  type NormalizedBill,
} from "@/lib/legislation/normalizeBill";
import { findFeaturedBill } from "@/data/featuredBills";
import { PlainLanguageSummary } from "@/components/legislation/PlainLanguageSummary";
import { CommunityImpactCard } from "@/components/legislation/CommunityImpactCard";
import { TrackBillButton } from "@/components/legislation/TrackBillButton";
import { toast } from "sonner";

export default function BillDetailPage() {
  // Route is /app/legislation/:congress/:type/:number
  const { congress, type, number } = useParams<{
    congress: string;
    type: string;
    number: string;
  }>();
  const navigate = useNavigate();

  const [bill, setBill] = useState<NormalizedBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!congress || !type || !number) {
        setError("Missing bill parameters in URL.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      // Featured bills can render directly without an API call
      const featured = findFeaturedBill(congress, type, number);
      if (featured) {
        const normalized: NormalizedBill = {
          id: `${congress}-${type}-${number}`,
          congress,
          billType: type,
          billNumber: number,
          jurisdiction: "federal",
          source: "congress",
          number: `${type.toUpperCase()} ${number}`,
          title: featured.title,
          status: featured.latestAction?.text,
          lastAction: featured.latestAction?.text,
          lastActionDate: featured.updateDate,
          fullText: (featured as any)._description ?? featured.title,
          url: undefined,
        };
        if (!cancelled) {
          setBill(normalized);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "bill-detail",
          { body: { congress, billType: type, billNumber: number } }
        );
        if (fnErr) throw fnErr;
        if (!data?.ok) throw new Error(data?.error ?? "Failed to load bill");
        const normalized = normalizeCongressBill(data.raw, congress, type, number);
        if (!cancelled) setBill(normalized);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load this bill");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [congress, type, number]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 pb-24">
        <Button
          variant="ghost"
          onClick={() => navigate("/app/legislation")}
          className="mb-6 text-muted-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to tracker
        </Button>
        <Card className="bg-card border-border p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-3">
              <h2 className="font-heading text-xl text-foreground">
                We couldn't load this bill
              </h2>
              <p className="text-sm text-muted-foreground">
                {error ?? "The bill data was unavailable. Try again in a moment."}
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Try again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/app/legislation")}
        className="text-muted-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to tracker
      </Button>

      {/* Bill header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold px-3 py-1 rounded-pill border border-primary text-primary">
            Federal · {bill.number}
          </span>
          <span className="text-sm px-3 py-1 rounded-pill border border-border text-muted-foreground">
            119th Congress (2025-2026)
          </span>
        </div>

        <h1 className="font-heading text-3xl md:text-4xl text-foreground leading-tight">
          {bill.title}
        </h1>

        {bill.sponsor && (
          <p className="text-sm text-muted-foreground">
            Sponsored by{" "}
            <span className="text-foreground font-medium">{bill.sponsor.name}</span>
            {bill.sponsor.party &&
              ` (${bill.sponsor.party}${bill.sponsor.state ? `-${bill.sponsor.state}` : ""})`}
          </p>
        )}

        {bill.lastAction && (
          <div className="bg-card border border-border rounded-card p-4">
            <p className="text-xs text-primary font-semibold mb-1">LATEST ACTION</p>
            <p className="text-sm text-foreground">{bill.lastAction}</p>
            {bill.lastActionDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {bill.lastActionDate}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2 flex-wrap items-center">
          <TrackBillButton bill={bill} />
          <Button variant="outline" onClick={handleShare} className="border-border">
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          {bill.url && (
            <Button variant="outline" asChild className="border-border">
              <a href={bill.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> Congress.gov
              </a>
            </Button>
          )}
        </div>
      </motion.div>

      {/* New AI-powered cards */}
      <PlainLanguageSummary bill={bill} />
      <CommunityImpactCard bill={bill} />
    </div>
  );
}
