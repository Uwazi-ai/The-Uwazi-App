import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Bookmark, BookmarkCheck, Plus, FileText, ThumbsUp, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRecentBills, useBillSearchCongress, hasCongressApiKey, detectCategory, formatBillType } from "@/hooks/useCongressApi";
import { useCivicLocation } from "@/hooks/useCivicLocation";
import { useLegiScanSearch, useLegiScanMasterList, useLegiScanBill, zipToState, US_STATES } from "@/hooks/useLegiScan";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { FEATURED_BILLS_2025 } from "@/data/featuredBills";

const categories = ["All", "Federal", "State", "Housing", "Health", "Education", "Criminal Justice"];

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
  const [selectedState, setSelectedState] = useState(() => zipToState(zipCode));
  const [stateBillDetailId, setStateBillDetailId] = useState<number | null>(null);
  const [stateDetailOpen, setStateDetailOpen] = useState(false);

  // Update selected state when ZIP changes
  useEffect(() => {
    if (zipCode) setSelectedState(zipToState(zipCode));
  }, [zipCode]);

  // LegiScan data for State filter
  const isStateFilter = activeFilter === "State";
  const stateSearchQuery = isStateFilter ? (debouncedQuery || "") : "";
  const { data: stateSearchData, isLoading: stateSearchLoading, error: stateSearchError } =
    useLegiScanSearch(isStateFilter ? selectedState : "", stateSearchQuery || "government");
  const { data: stateBillDetail } = useLegiScanBill(stateBillDetailId);

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

  const apiBills = isSearchMode
    ? (searchData?.bills || [])
    : (recentData?.bills || []);
  // Use featured curated bills when no search is active; fall back if API returns old/empty data
  const bills = isSearchMode ? apiBills : (apiBills.length > 0 ? FEATURED_BILLS_2025 : FEATURED_BILLS_2025);
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
      const { data, error: fetchError } = await supabase.functions.invoke("congress-proxy", {
        body: { path: `/bill/119/${type.toLowerCase()}/${number}` },
      });
      if (fetchError) throw new Error("Not found");
      const bill = data?.bill;
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
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6 md:space-y-8 overflow-x-hidden">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-2">LEGISLATION TRACKER</p>
        <h1 className="font-heading text-[22px] sm:text-3xl md:text-6xl text-foreground leading-tight">KNOW WHAT'S BEING DECIDED.</h1>
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          <span className="shrink-0 px-3 py-1.5 bg-card border border-border rounded-pill text-xs font-medium text-foreground">
            {isLoading ? "..." : `${bills.length} Bills Found`}
          </span>
          <span className="shrink-0 px-3 py-1.5 bg-card border border-border rounded-pill text-xs font-medium text-foreground">
            119th Congress (2025-2026)
          </span>
          <span className="shrink-0 px-3 py-1.5 bg-card border border-border rounded-pill text-xs font-medium text-foreground">
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
            placeholder={isStateFilter ? `Search ${selectedState} state bills...` : "Search bills (e.g. education, housing)..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-card border-border min-w-0"
          />
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

      {/* State filter controls */}
      {isStateFilter && (
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-card border border-border rounded-card px-3 py-2 text-sm text-foreground"
          >
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {zipCode ? `Auto-detected from ZIP ${zipCode}` : "Select your state"}
          </span>
        </div>
      )}

      {/* State bills */}
      {isStateFilter && stateSearchLoading && (
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

      {isStateFilter && stateSearchError && (
        <div className="bg-card border border-destructive/30 rounded-card p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-foreground mb-2">Unable to load state legislation.</p>
          <p className="text-xs text-muted-foreground mb-3">State legislation temporarily unavailable. Try federal bills or search by keyword.</p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["legiscan"] })}>
            Try Again
          </Button>
        </div>
      )}

      {isStateFilter && !stateSearchLoading && !stateSearchError && (stateSearchData?.bills || []).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(stateSearchData.bills || []).slice(0, 20).map((bill: any, idx: number) => {
            const billId = `state-${bill.bill_id}`;
            const isSaved = savedBillIds.has(billId);
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
                    {bill.bill_number || bill.bill_id}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-pill border border-amber-500/30 text-amber-400">
                    State · {selectedState}
                  </span>
                  {bill.relevance && (
                    <span className="text-xs px-2 py-0.5 rounded-pill bg-primary/10 text-primary">
                      {bill.relevance}% match
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-foreground mb-1 line-clamp-2">
                  {(bill.title || "Untitled").substring(0, 120)}
                  {(bill.title || "").length > 120 ? "..." : ""}
                </p>

                {bill.last_action_date && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Last action: {bill.last_action_date}
                  </p>
                )}

                {bill.last_action && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                    ⚡ {bill.last_action.substring(0, 80)}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        if (!user) return;
                        if (isSaved) {
                          await supabase.from("saved_legislation").delete().eq("user_id", user.id).eq("bill_id", billId);
                          toast.success("Bill removed");
                        } else {
                          await supabase.from("saved_legislation").insert({
                            user_id: user.id,
                            bill_id: billId,
                            bill_title: bill.title?.substring(0, 200),
                            bill_url: bill.url || null,
                            jurisdiction: "state",
                            zip_code: zipCode,
                          });
                          toast.success("State bill saved! +5 XP 🎓");
                        }
                        queryClient.invalidateQueries({ queryKey: ["saved_legislation"] });
                      }}
                      className={`text-xs flex items-center gap-1 transition-colors ${
                        isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                      {isSaved ? "Saved" : "Save"}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setStateBillDetailId(bill.bill_id);
                      setStateDetailOpen(true);
                    }}
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

      {isStateFilter && !stateSearchLoading && !stateSearchError && (stateSearchData?.bills || []).length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No recent bills found for {selectedState}. Try a different state or search term.
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && !isStateFilter && (
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
      {!isLoading && !error && displayBills.length > 0 && !isStateFilter && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayBills.slice(0, 20).map((bill: any, idx: number) => {
            const billId = `${bill.type}-${bill.number}-${bill.congress || "119"}`;
            const isSaved = savedBillIds.has(billId);
            const isUpvoted = myUpvoteSet.has(billId);
            const upvotes = (upvoteCounts || {})[billId] || 0;
            const category = bill._category || detectCategory(bill.title || "");
            const jurisdiction = bill._jurisdiction || "Federal";
            const updated = bill.updateDate
              ? formatDistanceToNow(new Date(bill.updateDate), { addSuffix: true })
              : null;
            const status = bill._status;

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
                    {jurisdiction}
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

                {status && (
                  <p className="text-xs font-medium text-primary mb-1">
                    📌 {status}
                  </p>
                )}

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
      {!isLoading && !error && displayBills.length === 0 && !showSaved && !isStateFilter && (
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

      {/* State Bill Detail Modal */}
      <Dialog open={stateDetailOpen} onOpenChange={setStateDetailOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-foreground">
              {stateBillDetail?.bill_number || "STATE BILL"}
            </DialogTitle>
          </DialogHeader>
          {stateBillDetail ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground font-medium">{stateBillDetail.title}</p>
              {stateBillDetail.description && (
                <p className="text-sm text-muted-foreground">{stateBillDetail.description}</p>
              )}
              <div className="space-y-2 text-xs">
                {stateBillDetail.state && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">State</span>
                    <span className="text-foreground">{stateBillDetail.state}</span>
                  </div>
                )}
                {stateBillDetail.status_desc && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-foreground">{stateBillDetail.status_desc}</span>
                  </div>
                )}
                {stateBillDetail.sponsors && stateBillDetail.sponsors.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Sponsors</span>
                    <div className="flex flex-wrap gap-1">
                      {stateBillDetail.sponsors.map((s: any, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-pill bg-muted text-foreground">
                          {s.name} ({s.party || "?"})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {stateBillDetail.history && stateBillDetail.history.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Recent Actions</span>
                    <div className="space-y-1">
                      {stateBillDetail.history.slice(-5).reverse().map((h: any, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          <span className="text-foreground">{h.date}</span> — {h.action}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {stateBillDetail.url && (
                <a href={stateBillDetail.url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-primary text-primary-foreground gap-1.5">
                    View Full Bill <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-3 py-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
