import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Bookmark, BookmarkCheck, Plus, FileText, ThumbsUp, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRecentBills, useBillSearchCongress, hasCongressApiKey, detectCategory, formatBillType } from "@/hooks/useCongressApi";
import { useCivicLocation } from "@/hooks/useCivicLocation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const categories = ["All", "Federal", "State", "Local", "Housing", "Health", "Education", "Criminal Justice"];

const categoryQueryMap: Record<string, string> = {
  Housing: "housing",
  Health: "health care",
  Education: "education",
  "Criminal Justice": "criminal justice",
};

export default function LegislationPage() {
  const { zipCode } = useCivicLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackInput, setTrackInput] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const hasKey = hasCongressApiKey();

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(t);
  }, [query]);

  // Determine effective query
  const effectiveQuery = activeFilter in categoryQueryMap
    ? categoryQueryMap[activeFilter]
    : debouncedQuery;

  const isSearchMode = !!effectiveQuery;

  const { data: recentData, isLoading: recentLoading, error: recentError } = useRecentBills("119", 20);
  const { data: searchData, isLoading: searchLoading, error: searchError } = useBillSearchCongress(effectiveQuery, "119", 20);

  const bills = isSearchMode
    ? (searchData?.bills || [])
    : (recentData?.bills || []);
  const isLoading = isSearchMode ? searchLoading : recentLoading;
  const error = isSearchMode ? searchError : recentError;

  // Saved legislation
  const { data: savedBills } = useQuery({
    queryKey: ["saved_legislation", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("saved_legislation").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const savedBillIds = new Set((savedBills || []).map((b: any) => b.bill_id));

  // Upvotes
  const { data: upvoteCounts } = useQuery({
    queryKey: ["bill_upvotes_counts"],
    queryFn: async () => {
      const { data } = await supabase.from("bill_upvotes" as any).select("bill_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { counts[r.bill_id] = (counts[r.bill_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: myUpvotes } = useQuery({
    queryKey: ["bill_upvotes_mine", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("bill_upvotes" as any).select("bill_id").eq("user_id", user.id);
      return (data || []).map((r: any) => r.bill_id);
    },
    enabled: !!user,
  });
  const myUpvoteSet = new Set(myUpvotes || []);

  const handleSave = async (bill: any) => {
    if (!user) return;
    const billId = `${bill.type}-${bill.number}-${bill.congress}`;
    if (savedBillIds.has(billId)) {
      await supabase.from("saved_legislation").delete().eq("user_id", user.id).eq("bill_id", billId);
      toast.success("Bill removed from saved");
    } else {
      await supabase.from("saved_legislation").insert({
        user_id: user.id,
        bill_id: billId,
        bill_title: bill.title?.substring(0, 200),
        bill_url: bill.url || null,
        jurisdiction: "federal",
        zip_code: zipCode,
      });
      toast.success("Bill saved! +5 XP 🎓");
    }
    queryClient.invalidateQueries({ queryKey: ["saved_legislation"] });
  };

  const handleUpvote = async (bill: any) => {
    if (!user) return;
    const billId = `${bill.type}-${bill.number}-${bill.congress}`;
    if (myUpvoteSet.has(billId)) {
      await supabase.from("bill_upvotes" as any).delete().eq("user_id", user.id).eq("bill_id", billId);
    } else {
      await supabase.from("bill_upvotes" as any).insert({ user_id: user.id, bill_id: billId });
    }
    queryClient.invalidateQueries({ queryKey: ["bill_upvotes"] });
  };

  const handleSearch = () => {
    setActiveFilter("All");
    setDebouncedQuery(query);
  };

  const handleFilterClick = (cat: string) => {
    setActiveFilter(cat);
    if (cat === "All" || cat === "Federal") {
      setQuery("");
      setDebouncedQuery("");
    }
  };

  const handleTrackBill = async () => {
    if (!trackInput.trim()) return;
    const match = trackInput.trim().match(/^(hr|s|hjres|sjres|hres|sres)\s*(\d+)$/i);
    if (!match) {
      toast.error("Enter a valid bill number like 'HR 1234' or 'S 567'");
      return;
    }
    const [, type, number] = match;
    try {
      const url = `https://api.congress.gov/v3/bill/119/${type.toLowerCase()}/${number}?api_key=${import.meta.env.VITE_CONGRESS_API_KEY}&format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      const bill = data.bill;
      if (bill && user) {
        const billId = `${type.toLowerCase()}-${number}-119`;
        await supabase.from("saved_legislation").insert({
          user_id: user.id,
          bill_id: billId,
          bill_title: bill.title?.substring(0, 200),
          bill_url: bill.url || null,
          jurisdiction: "federal",
          zip_code: zipCode,
        });
        queryClient.invalidateQueries({ queryKey: ["saved_legislation"] });
        toast.success("Bill added to your tracker ✓");
        setTrackModalOpen(false);
        setTrackInput("");
      }
    } catch {
      toast.error("Bill not found. Check the number and try again.");
    }
  };

  const displayBills = showSaved
    ? (savedBills || []).map((sb: any) => ({
        title: sb.bill_title,
        type: sb.bill_id.split("-")[0],
        number: sb.bill_id.split("-")[1],
        congress: sb.bill_id.split("-")[2] || "119",
        updateDate: sb.saved_at,
        _saved: true,
      }))
    : bills;

  if (!hasKey) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="bg-card rounded-card p-8 border border-border text-center">
          <AlertCircle className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="text-foreground font-medium mb-2">Congress API Key Required</p>
          <p className="text-muted-foreground text-sm">Configure VITE_CONGRESS_API_KEY in settings to enable live legislation data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-2">LEGISLATION TRACKER</p>
        <h1 className="font-heading text-5xl md:text-6xl text-foreground leading-none">KNOW WHAT'S BEING DECIDED.</h1>
        <div className="flex gap-3 mt-4 flex-wrap">
          <span className="px-3 py-1.5 bg-card border border-border rounded-pill text-xs font-medium text-foreground">
            {isLoading ? "..." : `${bills.length} Bills Found`}
          </span>
          <span className="px-3 py-1.5 bg-card border border-border rounded-pill text-xs font-medium text-foreground">
            {savedBills?.length || 0} Saved
          </span>
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={() => setTrackModalOpen(true)} className="bg-primary text-primary-foreground gap-1.5">
            <Plus className="h-4 w-4" /> Track a Bill
          </Button>
          <Button
            variant={showSaved ? "default" : "outline"}
            onClick={() => setShowSaved(!showSaved)}
            className={showSaved ? "bg-primary text-primary-foreground" : "border-primary text-primary"}
          >
            My Saved
          </Button>
        </div>
      </motion.div>

      {/* Search */}
      {!showSaved && (
        <div className="flex gap-2">
          <Input
            placeholder="Search bills (e.g. education, housing)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-card border-border"
          />
          <Button onClick={handleSearch} disabled={isLoading || !query.trim()} className="bg-primary text-primary-foreground">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Filters */}
      {!showSaved && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleFilterClick(cat)}
              className={`shrink-0 px-4 py-2 rounded-pill text-sm font-medium transition-all ${
                activeFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* State/Local messages */}
      {activeFilter === "State" && (
        <div className="bg-card border border-border rounded-card p-6 text-center">
          <p className="text-muted-foreground">🏛️ State legislation coming soon via OpenStates API</p>
        </div>
      )}
      {activeFilter === "Local" && (
        <div className="bg-card border border-border rounded-card p-6 text-center">
          <p className="text-muted-foreground">🏘️ Local legislation coming soon</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && activeFilter !== "State" && activeFilter !== "Local" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-card p-5 border border-border space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-card border border-destructive/30 rounded-card p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-foreground mb-2">Unable to load bills.</p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["congress"] })}>
            Try Again
          </Button>
        </div>
      )}

      {/* Bills Grid */}
      {!isLoading && !error && displayBills.length > 0 && activeFilter !== "State" && activeFilter !== "Local" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayBills.slice(0, 20).map((bill: any, idx: number) => {
            const billId = `${bill.type}-${bill.number}-${bill.congress || "119"}`;
            const isSaved = savedBillIds.has(billId);
            const isUpvoted = myUpvoteSet.has(billId);
            const upvotes = (upvoteCounts || {})[billId] || 0;
            const category = detectCategory(bill.title || "");
            const updated = bill.updateDate
              ? formatDistanceToNow(new Date(bill.updateDate), { addSuffix: true })
              : null;

            return (
              <motion.div
                key={billId + idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-card p-5 border border-border hover:border-primary/30 transition-all"
              >
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-pill border border-primary text-primary">
                    {formatBillType(bill.type || "")} {bill.number}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-pill border border-border text-muted-foreground">
                    Federal
                  </span>
                  {category && (
                    <span className="text-xs px-2 py-0.5 rounded-pill bg-primary/10 text-primary">
                      {category}
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-foreground mb-1 line-clamp-2">
                  {(bill.title || "Untitled").substring(0, 80)}
                  {(bill.title || "").length > 80 ? "..." : ""}
                </p>

                {bill.latestAction?.text && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                    ⚡ {bill.latestAction.text.substring(0, 60)}
                  </p>
                )}

                {updated && (
                  <p className="text-xs text-muted-foreground mb-3">Updated {updated}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleUpvote(bill)}
                      className={`text-xs flex items-center gap-1 transition-colors ${
                        isUpvoted ? "text-primary" : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> {upvotes}
                    </button>
                    <button
                      onClick={() => handleSave(bill)}
                      className={`text-xs flex items-center gap-1 transition-colors ${
                        isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                      {isSaved ? "Saved" : "Save"}
                    </button>
                  </div>
                  <button
                    onClick={() => navigate(`/legislation/${bill.congress || "119"}/${(bill.type || "").toLowerCase()}/${bill.number}`)}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    View Details →
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty search */}
      {!isLoading && !error && displayBills.length === 0 && !showSaved && activeFilter !== "State" && activeFilter !== "Local" && (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {debouncedQuery ? `No bills found for "${debouncedQuery}"` : "Loading recent bills..."}
          </p>
        </div>
      )}

      {showSaved && displayBills.length === 0 && (
        <div className="text-center py-12">
          <Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No saved bills yet. Search and save bills to track them here.</p>
        </div>
      )}

      {/* Track Modal */}
      <Dialog open={trackModalOpen} onOpenChange={setTrackModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-foreground">TRACK A BILL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter a bill number to add it to your tracker.</p>
            <Input
              placeholder="e.g. HR 1234 or S 567"
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrackBill()}
              className="bg-background border-border"
            />
            <Button onClick={handleTrackBill} className="w-full bg-primary text-primary-foreground">
              Add to Tracking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
