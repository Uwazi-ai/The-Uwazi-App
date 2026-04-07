import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, MapPin, Bell, Camera, Save, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
        setZipCode(data.zip_code || "");
        setStreetAddress(data.street_address || "");
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({
      display_name: displayName, zip_code: zipCode || null, street_address: streetAddress || null,
    }).eq("user_id", user.id);
    setSaving(false);
    toast.success("Profile updated! +5 XP 🎓");
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-2">SETTINGS</p>
        <h1 className="font-heading text-5xl text-foreground leading-none">YOUR PROFILE.</h1>
      </motion.div>

      {/* Avatar */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex items-center gap-4"
      >
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold relative">
          {displayName?.[0]?.toUpperCase() || "U"}
          <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{displayName || "User"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </motion.div>

      {/* Profile Fields */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-card p-6 border border-border space-y-4"
      >
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Display Name</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-background border-border" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</label>
          <Input value={user?.email || ""} disabled className="bg-background border-border opacity-50" />
        </div>
      </motion.div>

      {/* Civic Location */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-card p-6 border border-border space-y-4"
      >
        <h3 className="font-heading text-xl text-foreground">YOUR CIVIC LOCATION</h3>
        {zipCode && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/15 rounded-pill w-fit">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">📍 {zipCode}</span>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">ZIP Code</label>
          <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} maxLength={5} placeholder="e.g. 64110"
            className="bg-background border-border" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Street Address (optional)</label>
          <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="123 Main St"
            className="bg-background border-border" />
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground gap-1.5">
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-card rounded-card p-6 border border-border space-y-4"
      >
        <h3 className="font-heading text-xl text-foreground">NOTIFICATIONS</h3>
        {[
          { label: "Election reminders", desc: "Get notified about upcoming elections" },
          { label: "New lesson alerts", desc: "When new civic lessons are available" },
          { label: "Streak reminders", desc: "Don't break your learning streak" },
        ].map((n, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{n.label}</p>
              <p className="text-xs text-muted-foreground">{n.desc}</p>
            </div>
            <button className="h-6 w-10 bg-primary/20 rounded-full relative transition-colors">
              <div className="h-4 w-4 bg-primary rounded-full absolute top-1 right-1" />
            </button>
          </div>
        ))}
      </motion.div>

      {/* Sign Out */}
      <Button variant="outline" onClick={handleSignOut} className="w-full border-destructive text-destructive gap-1.5">
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}
