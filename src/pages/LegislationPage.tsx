import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Bookmark, ExternalLink, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBillSearch } from "@/hooks/useLegiScan";
import { useCivicLocation } from "@/hooks/useCivicLocation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const categories = ["All", "Federal", "State", "Local", "Housing", "Health", "Education", "Criminal Justice"];

function zipToStateAbbr(zip: string): string | null {
  const p = parseInt(zip.substring(0, 3));
  if (p >= 100 && p <= 149) return "NY";
  if (p >= 150 && p <= 196) return "PA";
  if (p >= 200 && p <= 205) return "DC";
  if (p >= 206 && p <= 219) return "MD";
  if (p >= 220 && p <= 246) return "VA";
  if (p >= 270 && p <= 289) return "NC";
  if (p >= 300 && p <= 319) return "GA";
  if (p >= 320 && p <= 349) return "FL";
  if (p >= 350 && p <= 369) return "AL";
  if (p >= 370 && p <= 385) return "TN";
  if (p >= 430 && p <= 459) return "OH";
  if (p >= 480 && p <= 499) return "MI";
  if (p >= 600 && p <= 629) return "IL";
  if (p >= 750 && p <= 799) return "TX";
  if (p >= 900 && p <= 961) return "CA";
  if (p >= 980 && p <= 994) return "WA";
  return "CA";
}

export default function LegislationPage() {
  const { zipCode } = useCivicLocation();
  const { user } = useAuth();
  const derivedState = zipCode ? zipToStateAbbr(zipCode) : "CA";
  const [query, setQuery] = useState("");
  const [searchTrigger, setSearchTrigger] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const { data: billResults, isLoading, error } = useBillSearch(derivedState || "CA", searchTrigger);

  const bills = billResults?.searchresult
    ? Object.values(billResults.searchresult).filter((b: any) => typeof b === "object" && b.bill_id)
    : [];

  const handleSearch = () => { if (query.trim()) setSearchTrigger(query.trim()); };

  const handleSave = async (bill: any) => {
    if (!user) return;
    await supabase.from("saved_legislation").insert({
      user_id: user.id, bill_id: String(bill.bill_id), bill_title: bill.title,
      bill_url: bill.url || null, jurisdiction: "state", zip_code: zipCode,
    });
    toast.success("Bill saved! +5 XP 🎓");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-2">LEGISLATION TRACKER</p>
        <h1 className="font-heading text-5xl md:text-6xl text-foreground leading-none">KNOW WHAT'S BEING DECIDED.</h1>
        <div className="flex gap-3 mt-4 flex-wrap">
          <span className="px-3 py-1.5 bg-card border border-border rounded-pill text-xs font-medium text-foreground">{bills.length} Bills Found</span>
          <span className="px-3 py-1.5 bg-card border border-border rounded-pill text-xs font-medium text-foreground">0 Saved</span>
        </div>
        <div className="flex gap-3 mt-4">
          <Button className="bg-primary text-primary-foreground gap-1.5"><Plus className="h-4 w-4" /> Track a Bill</Button>
          <Button variant="outline" className="border-primary text-primary">My Saved</Button>
        </div>
      </motion.div>

      {/* Search */}
      <div className="flex gap-2">
        <Input placeholder="Search bills (e.g. education, housing)..." value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="flex-1 bg-card border-border" />
        <Button onClick={handleSearch} disabled={isLoading || !query.trim()} className="bg-primary text-primary-foreground">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveFilter(cat)}
            className={`shrink-0 px-4 py-2 rounded-pill text-sm font-medium transition-all ${
              activeFilter === cat ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >{cat}</button>
        ))}
      </div>

      {/* Bills Grid */}
      {bills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(bills as any[]).slice(0, 12).map((bill: any) => (
            <motion.div key={bill.bill_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-card p-5 border border-border hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-pill border border-primary text-primary">{bill.state}</span>
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">{bill.bill_number}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{bill.title}</p>
              <div className="flex items-center justify-between">
                <button onClick={() => handleSave(bill)} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                  <Bookmark className="h-3.5 w-3.5" /> Save
                </button>
                <span className="text-xs text-primary font-medium cursor-pointer hover:underline">View Details →</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {searchTrigger && !isLoading && bills.length === 0 && !error && (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No bills found for "{searchTrigger}"</p>
        </div>
      )}

      {!searchTrigger && (
        <div className="text-center py-12">
          <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Search for legislation to track bills in your area.</p>
        </div>
      )}
    </div>
  );
}
