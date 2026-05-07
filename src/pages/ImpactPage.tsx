import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Medal, Users, Vote, MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import uwaziLogo from "@/assets/uwazi-logo.png";
import { useOrgTracking } from "@/hooks/useOrgTracking";

export default function ImpactPage() {
  useOrgTracking();
  const { data: orgs } = useQuery({
    queryKey: ["public-leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_orgs" as any)
        .select("*")
        .eq("is_active", true)
        .order("civic_impact_score", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: aggregateStats } = useQuery({
    queryKey: ["public-impact-stats"],
    queryFn: async () => {
      const { count: totalOrgs } = await supabase
        .from("partner_orgs" as any)
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      const { count: totalRegistrations } = await supabase
        .from("org_registrations" as any)
        .select("*", { count: "exact", head: true });
      const cities = new Set((orgs || []).map((o: any) => o.city).filter(Boolean));
      return {
        totalOrgs: totalOrgs || 0,
        totalRegistrations: totalRegistrations || 0,
        cities: cities.size || 0,
      };
    },
    enabled: !!orgs,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-4">
        <div className="max-w-[1000px] mx-auto flex items-center gap-3">
          <img src={uwaziLogo} alt="UWAZI" className="h-8" />
        </div>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-16 md:py-24 px-4"
      >
        <h1 className="text-4xl md:text-6xl font-axis uppercase text-foreground mb-4">
          THE CIVIC IMPACT LEAGUE
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Organizations competing to build a more civically engaged America
        </p>

        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          <Card className="p-4 text-center">
            <Vote className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl md:text-3xl font-axis text-foreground">{aggregateStats?.totalRegistrations || 0}</p>
            <p className="text-[10px] text-muted-foreground">Voters Engaged</p>
          </Card>
          <Card className="p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl md:text-3xl font-axis text-foreground">{aggregateStats?.totalOrgs || 0}</p>
            <p className="text-[10px] text-muted-foreground">Organizations</p>
          </Card>
          <Card className="p-4 text-center">
            <MapPin className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl md:text-3xl font-axis text-foreground">{aggregateStats?.cities || 0}</p>
            <p className="text-[10px] text-muted-foreground">Cities</p>
          </Card>
        </div>
      </motion.div>

      {/* Leaderboard */}
      <div className="max-w-[800px] mx-auto px-4 pb-16">
        <h2 className="text-sm font-axis uppercase text-muted-foreground mb-4 tracking-widest">NATIONAL LEADERBOARD</h2>
        <div className="space-y-2">
          {orgs?.map((o: any, i: number) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-4 flex items-center gap-4">
                <div className="text-center w-8">
                  {i < 3 ? (
                    <Medal className={`h-6 w-6 mx-auto ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : "text-amber-600"}`} />
                  ) : (
                    <span className="text-lg font-axis text-muted-foreground">#{i + 1}</span>
                  )}
                </div>
                {o.logo_url ? (
                  <img src={o.logo_url} alt={o.name} className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-axis">
                    {o.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{o.name}</p>
                  <p className="text-xs text-muted-foreground">{o.city || "—"} · <span className="capitalize">{o.category}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-axis text-primary">{o.civic_impact_score || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Impact Score</p>
                </div>
              </Card>
            </motion.div>
          ))}
          {!orgs?.length && (
            <p className="text-center text-muted-foreground py-12">No organizations have joined yet. Be the first!</p>
          )}
        </div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-card border-t border-border py-16 px-4 text-center"
      >
        <h2 className="text-2xl md:text-3xl font-axis uppercase text-foreground mb-3">
          Is your organization ready to compete?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Join the Civic Impact League and help your community become more civically engaged.
        </p>
        <a href="mailto:Myke@uwazi.ai?subject=Civic Impact League Interest">
          <Button size="lg" className="gap-2 font-axis">
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
        </a>
      </motion.div>

      {/* Footer disclaimer */}
      <div className="text-center py-6 px-4">
        <p className="text-[10px] text-muted-foreground max-w-xl mx-auto">
          UWAZI provides factual candidate info and civic engagement tools. We do not endorse any candidate, party, or political position.
        </p>
      </div>
    </div>
  );
}
