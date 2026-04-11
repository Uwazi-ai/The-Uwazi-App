import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, MapPin, Bell, Eye, Globe, Moon, Shield, Download, Trash2, ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CivicLocationSection from "@/components/profile/CivicLocationSection";

const profileSections = [
  {
    label: "Preferences",
    items: [
      { icon: Bell, title: "Notifications", subtitle: "Alerts, reminders" },
      { icon: Eye, title: "Content Preferences", subtitle: "Topics, reading depth" },
      { icon: Globe, title: "Language", subtitle: "English" },
      { icon: Moon, title: "Appearance", subtitle: "Light mode" },
    ],
  },
  {
    label: "Accessibility",
    items: [
      { icon: Eye, title: "Text Size & Contrast", subtitle: "Readability options" },
    ],
  },
  {
    label: "Privacy & Data",
    items: [
      { icon: Shield, title: "Privacy Controls", subtitle: "Data sharing settings" },
      { icon: Download, title: "Download My Data", subtitle: "Export your information" },
      { icon: Trash2, title: "Delete Account", subtitle: "Permanently remove data" },
    ],
  },
];

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    display_name: string | null;
    zip_code: string | null;
    street_address: string | null;
    location: string | null;
  } | null>(null);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, zip_code, street_address, location")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setProfile(data);
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "UWAZI User";
  const locationText = [profile?.zip_code, profile?.location].filter(Boolean).join(" · ") || "No location set";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8 space-y-6">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl gradient-civic flex items-center justify-center text-primary-foreground text-xl font-bold shadow-elevated">
          {displayName[0]?.toUpperCase() || "U"}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
          <p className="text-sm text-muted-foreground">{locationText}</p>
        </div>
      </motion.div>

      {/* Civic Stats */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: "Questions Asked", value: "12" },
          { label: "Items Saved", value: "8" },
          { label: "Plan Progress", value: "0%" },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-xl p-3 shadow-card text-center">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Civic Location Section */}
      <CivicLocationSection
        currentZip={profile?.zip_code || null}
        currentAddress={profile?.street_address || null}
        onUpdate={fetchProfile}
      />

      {/* Account Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2 px-1">Account</h2>
        <div className="bg-card rounded-xl shadow-card divide-y divide-border">
          <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors rounded-t-xl">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-foreground" strokeWidth={1.8} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Edit Profile</p>
              <p className="text-[11px] text-muted-foreground">Name, email, photo</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors rounded-b-xl">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-foreground" strokeWidth={1.8} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Location & District</p>
              <p className="text-[11px] text-muted-foreground">Update your address</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      {/* Settings Sections */}
      {profileSections.map((section, si) => (
        <motion.div key={si} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + si * 0.05 }}>
          <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2 px-1">{section.label}</h2>
          <div className="bg-card rounded-xl shadow-card divide-y divide-border">
            {section.items.map((item, i) => (
              <button key={i} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors first:rounded-t-xl last:rounded-b-xl">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-foreground" strokeWidth={1.8} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Sign Out */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-civic-coral hover:bg-civic-coral/5 transition-colors">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}
