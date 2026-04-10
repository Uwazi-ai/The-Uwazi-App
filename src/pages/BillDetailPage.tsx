import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillDetailCongress, useBillSummaries, formatBillType } from "@/hooks/useCongressApi";
import { findFeaturedBill } from "@/data/featuredBills";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCivicLocation } from "@/hooks/useCivicLocation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function BillDetailPage() {
  const { congress, type, number } = useParams<{ congress: string; type: string; number: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { zipCode } = useCivicLocation();
  const queryClient = useQueryClient();

  // Check if this is a featured/curated bill first
  const featuredBill = findFeaturedBill(congress || "", type || "", number || "");

  // Only call the API if it's NOT a featured bill
  const { data, isLoading } = useBillDetailCongress(
    featuredBill ? "" : (congress || ""),
    featuredBill ? "" : (type || ""),
    featuredBill ? "" : (number || "")
  );
  const { data: summaryData } = useBillSummaries(
    featuredBill ? "" : (congress || ""),
    featuredBill ? "" : (type || ""),
    featuredBill ? "" : (number || "")
  );

  // Build a unified bill object — prefer API data, fall back to featured
  const apiBill = data?.bill;
  const bill = apiBill || (featuredBill ? {
    title: featuredBill.title,
    latestAction: { text: featuredBill.latestAction.text, actionDate: featuredBill.updateDate },
    sponsors: [],
    url: null,
    _status: featuredBill._status,
    _category: featuredBill._category,
    _description: featuredBill._description,
  } : null);

  const summaries = summaryData?.summaries || [];
  const billId = `${type}-${number}-${congress}`;

  const { data: savedBills } = useQuery({
    queryKey: ["saved_legislation", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("saved_legislation").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });
  const isSaved = (savedBills || []).some((b: any) => b.bill_id === billId);

  const handleSave = async () => {
    if (!user || !bill) return;
    if (isSaved) {
      await supabase.from("saved_legislation").delete().eq("user_id", user.id).eq("bill_id", billId);
      toast.success("Removed from saved");
    } else {
      await supabase.from("saved_legislation").insert({
        user_id: user.id, bill_id: billId,
        bill_title: bill.title?.substring(0, 200),
        bill_url: bill.url || null, jurisdiction: "federal", zip_code: zipCode,
      });
      toast.success("Bill saved! +5 XP 🎓");
    }
    queryClient.invalidateQueries({ queryKey: ["saved_legislation"] });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  if (isLoading && !featuredBill) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 text-center">
        <p className="text-muted-foreground">Bill not found.</p>
        <Button variant="outline" onClick={() => navigate("/legislation")} className="mt-4">← Back</Button>
      </div>
    );
  }

  const sponsor = bill.sponsors?.[0];
  const latestAction = bill.latestAction;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6">
      <button onClick={() => navigate("/legislation")} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to Legislation
      </button>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold px-3 py-1 rounded-pill border border-primary text-primary">
            {formatBillType(type || "")} {number}
          </span>
          <span className="text-sm px-3 py-1 rounded-pill border border-border text-muted-foreground">
            119th Congress (2025-2026)
          </span>
          {(bill as any)?._status && (
            <span className="text-sm px-3 py-1 rounded-pill bg-primary/10 text-primary font-medium">
              📌 {(bill as any)._status}
            </span>
          )}
          {(bill as any)?._category && (
            <span className="text-sm px-3 py-1 rounded-pill border border-border text-muted-foreground">
              {(bill as any)._category}
            </span>
          )}
        </div>

        <h1 className="font-heading text-3xl md:text-4xl text-foreground leading-tight">{bill.title}</h1>

        {sponsor && (
          <p className="text-muted-foreground">
            Sponsor: <span className="text-foreground font-medium">{sponsor.fullName || sponsor.firstName + " " + sponsor.lastName}</span>
            {sponsor.party && <span> ({sponsor.party})</span>}
            {sponsor.state && <span> — {sponsor.state}</span>}
          </p>
        )}

        {(bill as any)?._description && (
          <div className="bg-card border border-border rounded-card p-4">
            <p className="text-xs text-primary font-semibold mb-1">ABOUT THIS BILL</p>
            <p className="text-sm text-muted-foreground">{(bill as any)._description}</p>
          </div>
        )}

        {latestAction && (
          <div className="bg-card border border-border rounded-card p-4">
            <p className="text-xs text-primary font-semibold mb-1">LATEST ACTION</p>
            <p className="text-sm text-foreground">{latestAction.text}</p>
            {latestAction.actionDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(latestAction.actionDate), { addSuffix: true })}
              </p>
            )}
          </div>
        )}

        {summaries.length > 0 && (
          <div className="bg-card border border-border rounded-card p-4">
            <p className="text-xs text-primary font-semibold mb-2">SUMMARY</p>
            <div
              className="text-sm text-muted-foreground prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: summaries[summaries.length - 1].text }}
            />
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button onClick={handleSave} variant={isSaved ? "default" : "outline"} className={isSaved ? "bg-primary text-primary-foreground" : "border-primary text-primary"}>
            {isSaved ? <BookmarkCheck className="h-4 w-4 mr-1" /> : <Bookmark className="h-4 w-4 mr-1" />}
            {isSaved ? "Saved" : "Save Bill"}
          </Button>
          <Button variant="outline" onClick={handleShare} className="border-border">
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
          {bill.url && (
            <Button variant="outline" asChild className="border-border">
              <a href={bill.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Congress.gov
              </a>
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
