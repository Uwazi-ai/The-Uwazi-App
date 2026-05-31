import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Share2, Volume2, Sparkles, ExternalLink, Filter } from "lucide-react";

const categories = ["All", "Elections", "Legislation", "Local", "Education", "Economy", "Housing", "Health"];

const articles = [
  {
    id: 1,
    title: "Your Complete Guide to the 2026 Midterm Elections",
    excerpt: "What you need to know about key races, ballot measures, and how to make your voice heard this election cycle.",
    category: "Elections",
    source: "Civic Wire",
    time: "1h ago",
    credibility: "High",
    featured: true,
  },
  {
    id: 2,
    title: "New Infrastructure Bill: What It Means for Your Community",
    excerpt: "A plain-language breakdown of the proposed infrastructure investments and how they could affect your daily life.",
    category: "Legislation",
    source: "Policy Brief",
    time: "3h ago",
    credibility: "High",
  },
  {
    id: 3,
    title: "Local School Board Makes Key Decision on Curriculum",
    excerpt: "Your district's school board voted on new educational standards. Here's what changes.",
    category: "Education",
    source: "District Watch",
    time: "5h ago",
    credibility: "Medium",
  },
  {
    id: 4,
    title: "Housing Affordability: State Proposes Rent Cap Legislation",
    excerpt: "The proposed bill aims to address rising housing costs through a combination of rent stabilization and new construction incentives.",
    category: "Housing",
    source: "State Capitol",
    time: "7h ago",
    credibility: "High",
  },
  {
    id: 5,
    title: "City Council Approves Transit Expansion Plan",
    excerpt: "New bus routes and light rail extensions planned for the metropolitan area over the next five years.",
    category: "Local",
    source: "City Hall",
    time: "9h ago",
    credibility: "High",
  },
  {
    id: 6,
    title: "Healthcare Access Act: Plain Language Summary",
    excerpt: "What the proposed changes to healthcare coverage would mean for uninsured and underinsured residents.",
    category: "Health",
    source: "Health Policy Today",
    time: "12h ago",
    credibility: "High",
  },
];

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All" ? articles : articles.filter((a) => a.category === activeCategory);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8 space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Civic News</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Non-partisan updates that matter to you</p>
      </motion.div>

      {/* Category Filter */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3.5 py-2 rounded-pill text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "gradient-civic text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground border border-border hover:border-primary/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Articles */}
      <div className="space-y-3">
        {filtered.map((article, i) => (
          <motion.article
            key={article.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className={`bg-card rounded-2xl shadow-card hover:shadow-elevated transition-shadow cursor-pointer overflow-hidden ${
              article.featured ? "border border-primary/20" : ""
            }`}
          >
            <div className="p-4">
              {/* Meta */}
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-primary/10 text-primary">
                  {article.category}
                </span>
                {article.featured && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-civic-gold/10 text-civic-gold">
                    Featured
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">{article.time}</span>
              </div>

              {/* Content */}
              <h2 className="text-base font-semibold text-foreground mb-1.5 leading-snug">{article.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{article.excerpt}</p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{article.source}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-pill ${
                    article.credibility === "High" ? "bg-civic-success/10 text-civic-success" : "bg-civic-gold/10 text-civic-gold"
                  }`}>
                    {article.credibility}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button aria-label="Summarize article with AI" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                  <button aria-label="Save article" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Bookmark className="h-3.5 w-3.5" />
                  </button>
                  <button aria-label="Share article" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
