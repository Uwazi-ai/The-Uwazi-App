import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Bookmark, BookmarkCheck, Share2, ExternalLink, MapPin, AlertCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCivicNews, useLocalNews, hasNewsApiKey, zipToRegion } from "@/hooks/useNewsApi";
import { useCivicLocation } from "@/hooks/useCivicLocation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const filters = ["All", "Elections", "Legislation", "Local Gov", "Voting Rights", "Policy"];

export default function CivicFeedPage() {
  const { zipCode } = useCivicLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasKey = hasNewsApiKey();

  const [activeFilter, setActiveFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"publishedAt" | "relevancy">("publishedAt");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    localStorage.getItem("uwazi_nonpartisan_dismissed") === "true"
  );

  const { data, isLoading, error } = useCivicNews(activeFilter, page, sortBy);
  const region = zipToRegion(zipCode);
  const { data: localData } = useLocalNews(region);

  // Accumulate pages
  useEffect(() => {
    if (data?.articles) {
      if (page === 1) setAllArticles(data.articles);
      else setAllArticles((prev) => [...prev, ...data.articles]);
    }
  }, [data, page]);

  // Reset on filter/sort change
  useEffect(() => { setPage(1); setAllArticles([]); }, [activeFilter, sortBy]);

  // Saved articles
  const { data: savedArticles } = useQuery({
    queryKey: ["saved_articles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("saved_articles" as any).select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });
  const savedUrls = new Set((savedArticles || []).map((a: any) => a.article_url));

  const handleSave = async (article: any) => {
    if (!user) return;
    if (savedUrls.has(article.url)) {
      await supabase.from("saved_articles" as any).delete().eq("user_id", user.id).eq("article_url", article.url);
      toast.success("Article removed");
    } else {
      await supabase.from("saved_articles" as any).insert({
        user_id: user.id,
        article_url: article.url,
        article_title: article.title?.substring(0, 200),
        article_source: article.source?.name || null,
        article_image: article.urlToImage || null,
      });
      toast.success("Article saved!");
    }
    queryClient.invalidateQueries({ queryKey: ["saved_articles"] });
  };

  const handleShare = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem("uwazi_nonpartisan_dismissed", "true");
  };

  // Client-side search filter
  const displayArticles = useMemo(() => {
    if (!searchQuery.trim()) return allArticles;
    const q = searchQuery.toLowerCase();
    return allArticles.filter((a: any) =>
      (a.title || "").toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q)
    );
  }, [allArticles, searchQuery]);

  const localArticles = localData?.articles || [];
  const totalResults = data?.totalResults || 0;
  const hasMore = allArticles.length < totalResults;

  if (!hasKey) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="bg-card rounded-card p-8 border border-border text-center">
          <AlertCircle className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="text-foreground font-medium mb-2">News API Key Required</p>
          <p className="text-muted-foreground text-sm">Configure VITE_NEWS_API_KEY to enable live civic news.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8 space-y-6 overflow-x-hidden">
      {/* Nonpartisan banner */}
      {!bannerDismissed && (
        <div className="bg-card border border-border rounded-card p-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            UWAZI curates civic news from multiple sources. We do not endorse any political viewpoint.
          </p>
          <button onClick={handleDismissBanner} className="text-muted-foreground hover:text-foreground shrink-0 ml-3">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-2">CIVIC FEED</p>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl text-foreground leading-none">STAY INFORMED.</h1>
        <p className="text-sm md:text-lg text-muted-foreground mt-1">Nonpartisan civic news curated for your community.</p>
        {zipCode && (
          <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-card border border-border rounded-pill text-xs font-medium text-foreground">
            <MapPin className="h-3 w-3 text-primary" /> {zipCode} · Personalized for your area
          </span>
        )}
      </motion.div>

      {/* Controls */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 px-4 py-2 rounded-pill text-sm font-medium transition-all ${
                activeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0 bg-card border-border"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="shrink-0 bg-card border border-border rounded-card px-3 py-2 text-sm text-foreground w-full sm:w-auto"
          >
            <option value="publishedAt">Latest</option>
            <option value="relevancy">Most Relevant</option>
          </select>
        </div>
      </div>

      {/* Local news section */}
      {localArticles.length > 0 && !searchQuery && (
        <div className="space-y-3">
          <h2 className="font-heading text-xl text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> IN YOUR AREA
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localArticles.slice(0, 3).map((article: any, i: number) => (
              <ArticleCard
                key={article.url + i}
                article={article}
                isSaved={savedUrls.has(article.url)}
                onSave={() => handleSave(article)}
                onShare={() => handleShare(article.url)}
                isLocal
              />
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && page === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-card p-5 border border-border space-y-3">
              <Skeleton className="h-36 w-full rounded-card" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-card border border-destructive/30 rounded-card p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-foreground mb-2">Unable to load news. Check back soon.</p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["news"] })}>
            Retry
          </Button>
        </div>
      )}

      {/* Featured article */}
      {!isLoading && displayArticles.length > 0 && (
        <>
          <FeaturedCard
            article={displayArticles[0]}
            isSaved={savedUrls.has(displayArticles[0]?.url)}
            onSave={() => handleSave(displayArticles[0])}
            onShare={() => handleShare(displayArticles[0]?.url)}
          />

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayArticles.slice(1).map((article: any, i: number) => (
              <ArticleCard
                key={article.url + i}
                article={article}
                isSaved={savedUrls.has(article.url)}
                onSave={() => handleSave(article)}
                onShare={() => handleShare(article.url)}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && !searchQuery && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={isLoading}
                className="border-primary text-primary"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Load More
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty */}
      {!isLoading && !error && displayArticles.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No articles found. Try a different filter.</p>
        </div>
      )}

      {/* Attribution */}
      <p className="text-center text-xs text-muted-foreground pt-4">Powered by NewsAPI</p>
    </div>
  );
}

function FeaturedCard({ article, isSaved, onSave, onShare }: {
  article: any; isSaved: boolean; onSave: () => void; onShare: () => void;
}) {
  if (!article) return null;
  const published = article.publishedAt
    ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-card border border-border overflow-hidden"
    >
      {article.urlToImage && (
        <img src={article.urlToImage} alt="" className="w-full h-48 md:h-64 object-cover" />
      )}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-pill bg-muted text-muted-foreground">
            {article.source?.name || "Source"}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-pill border border-primary text-primary">Featured</span>
          {published && <span className="text-xs text-muted-foreground ml-auto">{published}</span>}
        </div>
        <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-2">{article.title}</h2>
        <p className="text-muted-foreground mb-4 line-clamp-3">{article.description}</p>
        <div className="flex items-center gap-3">
          <a href={article.url} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-card text-sm font-semibold inline-flex items-center gap-1.5">
            Read More <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button onClick={onSave} className={`p-2 rounded-card transition-colors ${isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            {isSaved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
          </button>
          <button onClick={onShare} className="p-2 rounded-card text-muted-foreground hover:text-primary transition-colors">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ArticleCard({ article, isSaved, onSave, onShare, isLocal }: {
  article: any; isSaved: boolean; onSave: () => void; onShare: () => void; isLocal?: boolean;
}) {
  const published = article.publishedAt
    ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-card border border-border hover:border-primary/30 transition-all overflow-hidden flex flex-col"
    >
      {article.urlToImage ? (
        <img src={article.urlToImage} alt="" className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-muted flex items-center justify-center">
          <span className="text-2xl font-heading text-muted-foreground/30">UWAZI</span>
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-pill bg-muted text-muted-foreground">
            {article.source?.name || "Source"}
          </span>
          {isLocal && (
            <span className="text-[10px] px-2 py-0.5 rounded-pill border border-primary text-primary flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" /> Local
            </span>
          )}
        </div>
        <h3 className="text-sm font-bold text-foreground mb-1 line-clamp-2">{article.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-3 mb-2 flex-1">{article.description}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{article.author ? `${article.author.substring(0, 20)} · ` : ""}{published}</span>
        </div>
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <button onClick={onSave} className={`transition-colors ${isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            </button>
            <button onClick={onShare} className="text-muted-foreground hover:text-primary transition-colors">
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <a href={article.url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary font-medium hover:underline">
            Read More →
          </a>
        </div>
      </div>
    </motion.div>
  );
}
