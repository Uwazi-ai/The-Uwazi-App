import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, MapPin, Bell, Camera, Save, LogOut, Lock, Trash2,
  Check, X, Loader2, Eye, EyeOff, AlertTriangle, ChevronLeft, Download, Monitor,
  Sun, Moon, Laptop, Pencil,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePWAInstall } from "@/components/PWAInstallPrompt";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { US_STATES, getStateFromZip } from "@/utils/stateFromZip";

interface ProfileData {
  display_name: string | null;
  zip_code: string | null;
  street_address: string | null;
  avatar_url: string | null;
  notify_elections: boolean;
  notify_new_lessons: boolean;
  notify_streak_reminders: boolean;
  notify_civic_alerts: boolean;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_code: string | null;
  full_address: string | null;
}

function ThemePreview({ mode }: { mode: "dark" | "light" | "system" }) {
  if (mode === "system") {
    return (
      <div className="w-[72px] h-[48px] rounded-lg overflow-hidden flex" style={{ border: "1px solid var(--border-subtle)" }}>
        <div className="w-1/2 bg-[#111] flex flex-col">
          <div className="w-[10px] h-full bg-[#0a0a0a] border-r border-[rgba(255,255,255,0.06)]" />
        </div>
        <div className="w-1/2 bg-[#f5f5f7] flex flex-col">
          <div className="w-[10px] h-full bg-[#e8e8ea] border-r border-[rgba(0,0,0,0.06)]" />
        </div>
      </div>
    );
  }
  const isDark = mode === "dark";
  return (
    <div className="w-[72px] h-[48px] rounded-lg overflow-hidden flex"
      style={{
        background: isDark ? "#111" : "#f5f5f7",
        border: "1px solid var(--border-subtle)",
      }}>
      <div style={{
        width: 20,
        background: isDark ? "#0a0a0a" : "#e8e8ea",
        borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      }} />
      <div className="flex-1 flex flex-col p-1.5 gap-1">
        <div className="rounded-sm h-[5px]"
          style={{ background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />
        <div className="rounded-sm h-[5px] w-[60%]"
          style={{ background: isDark ? "rgba(155,211,75,0.4)" : "rgba(90,158,30,0.5)" }} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { refreshProfile } = useProfile();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isInstalled, install, isSupported } = usePWAInstall();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => setThemeMounted(true), []);

  const [loading, setLoading] = useState(true);

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Address fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [currentFullAddress, setCurrentFullAddress] = useState<string | null>(null);

  // Notifications
  const [notifyElections, setNotifyElections] = useState(true);
  const [notifyNewLessons, setNotifyNewLessons] = useState(true);
  const [notifyStreakReminders, setNotifyStreakReminders] = useState(true);
  const [notifyCivicAlerts, setNotifyCivicAlerts] = useState(true);
  const [savedToggle, setSavedToggle] = useState<string | null>(null);

  // Change password
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account
  const [deletingAccount, setDeletingAccount] = useState(false);

  const isZipValid = /^\d{5}$/.test(addressZip);

  // Auto-fill state from ZIP
  useEffect(() => {
    if (isZipValid && editingAddress) {
      setAddressState(getStateFromZip(addressZip));
    }
  }, [addressZip, isZipValid, editingAddress]);

  // Load profile data
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("display_name, zip_code, street_address, avatar_url, notify_elections, notify_new_lessons, notify_streak_reminders, notify_civic_alerts, address_line1, address_line2, city, state_code, full_address")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setDisplayName(data.display_name || "");
        setAvatarUrl(data.avatar_url);
        setNotifyElections(data.notify_elections ?? true);
        setNotifyNewLessons(data.notify_new_lessons ?? true);
        setNotifyStreakReminders(data.notify_streak_reminders ?? true);
        setNotifyCivicAlerts(data.notify_civic_alerts ?? true);
        setAddressLine1((data as any).address_line1 || data.street_address || "");
        setAddressLine2((data as any).address_line2 || "");
        setAddressCity((data as any).city || "");
        setAddressState((data as any).state_code || "");
        setAddressZip(data.zip_code || "");
        setCurrentFullAddress((data as any).full_address || null);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const freshUrl = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: freshUrl }).eq("user_id", user.id);
      setAvatarUrl(freshUrl);
      setAvatarPreview(null);
      toast.success("Profile photo updated ✓");
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!displayName.trim()) { setNameError("Display name is required"); return; }
    setNameError("");
    setSavingProfile(true);
    await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("user_id", user.id);
    setSavingProfile(false);
    toast.success("Profile updated ✓");
    refreshProfile();
  };

  const handleSaveAddress = async () => {
    if (!user || !isZipValid || !addressLine1.trim() || !addressCity.trim() || !addressState) return;
    setSavingAddress(true);
    const fullAddr = `${addressLine1.trim()}${addressLine2.trim() ? " " + addressLine2.trim() : ""}, ${addressCity.trim()}, ${addressState} ${addressZip.trim()}`;
    await supabase.from("profiles").update({
      address_line1: addressLine1.trim(),
      address_line2: addressLine2.trim() || null,
      city: addressCity.trim(),
      state_code: addressState,
      zip_code: addressZip.trim(),
      full_address: fullAddr,
      street_address: addressLine1.trim(),
    }).eq("user_id", user.id);
    setCurrentFullAddress(fullAddr);
    setSavingAddress(false);
    setEditingAddress(false);
    toast.success("Voting address updated ✓");
    refreshProfile();
  };

  const handleToggle = useCallback(async (key: string, value: boolean) => {
    if (!user) return;
    await supabase.from("profiles").update({ [key]: value }).eq("user_id", user.id);
    setSavedToggle(key);
    setTimeout(() => setSavedToggle(null), 1500);
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < 8) { setPasswordError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match"); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { setPasswordError(error.message); } else {
      setShowPasswordModal(false); setNewPassword(""); setConfirmPassword(""); toast.success("Password updated ✓");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      await signOut(); navigate("/login"); toast.success("Your account has been deleted.");
    } catch (err: any) { toast.error(err.message || "Failed to delete account"); }
    finally { setDeletingAccount(false); }
  };

  const handleSignOut = async () => { await signOut(); toast.success("Signed out"); navigate("/login"); };

  const currentAvatar = avatarPreview || avatarUrl;
  const initials = displayName?.[0]?.toUpperCase() || "U";

  const toggleItems = [
    { key: "notify_elections", label: "Election reminders", desc: "Get notified about upcoming elections", value: notifyElections, setter: setNotifyElections },
    { key: "notify_new_lessons", label: "New lesson available", desc: "When new civic lessons are available", value: notifyNewLessons, setter: setNotifyNewLessons },
    { key: "notify_streak_reminders", label: "Streak reminders", desc: "Don't break your learning streak", value: notifyStreakReminders, setter: setNotifyStreakReminders },
    { key: "notify_civic_alerts", label: "Civic alerts for my ZIP", desc: "Alerts about civic events in your area", value: notifyCivicAlerts, setter: setNotifyCivicAlerts },
  ];

  const themeOptions = [
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "system" as const, label: "System", icon: Laptop },
  ];

  const addressIsValid = addressLine1.trim().length >= 5 && addressCity.trim().length >= 2 && addressState && isZipValid;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-48" /></div>
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8 pb-28 md:pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={() => navigate("/")}
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="eyebrow mb-1">SETTINGS</p>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground leading-none">YOUR PROFILE.</h1>
        </div>
      </motion.div>

      {/* Avatar Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-4">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <button onClick={handleAvatarClick} className="relative h-20 w-20 rounded-full shrink-0 group overflow-hidden" disabled={uploadingAvatar}>
          {currentAvatar ? (
            <img src={currentAvatar} alt="Avatar" className="h-full w-full object-cover rounded-full" />
          ) : (
            <div className="h-full w-full rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">{initials}</div>
          )}
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
          </div>
        </button>
        <div>
          <p className="text-lg font-bold text-foreground">{displayName || "User"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <button onClick={handleAvatarClick} className="text-xs text-primary hover:underline mt-0.5">Change Photo</button>
        </div>
      </motion.div>

      {/* APPEARANCE */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="rounded-xl p-6 space-y-4" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
        <h3 className="font-heading text-xl text-foreground flex items-center gap-2">
          <Sun className="h-5 w-5 text-primary" /> APPEARANCE
        </h3>
        {themeMounted && (
          <div className="flex gap-3">
            {themeOptions.map((opt) => {
              const isActive = theme === opt.value;
              return (
                <button key={opt.value} onClick={() => setTheme(opt.value)}
                  className="flex flex-col items-center gap-2 p-3 rounded-card min-w-[90px] transition-all duration-200"
                  style={{
                    background: isActive ? "var(--input-bg)" : "transparent",
                    border: isActive ? "2px solid hsl(var(--primary))" : "2px solid var(--border-subtle)",
                  }}>
                  <ThemePreview mode={opt.value} />
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {opt.label}
                    </span>
                    {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Profile Fields */}
      <motion.form onSubmit={handleSaveProfile} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-xl p-6 space-y-4" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
        <h3 className="font-heading text-xl text-foreground">PROFILE INFO</h3>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Display Name <span className="text-destructive">*</span>
          </label>
          <Input value={displayName} onChange={(e) => { setDisplayName(e.target.value); setNameError(""); }}
            className={`bg-background border-border ${nameError ? "border-destructive" : ""}`} placeholder="Your name" />
          {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</label>
          <Input value={user?.email || ""} disabled className="bg-background border-border opacity-50" />
        </div>
        <Button type="submit" disabled={savingProfile} className="bg-primary text-primary-foreground gap-1.5">
          {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {savingProfile ? "Saving..." : "Save Changes"}
        </Button>
      </motion.form>

      {/* YOUR VOTING ADDRESS */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-xl p-6 space-y-4" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
        <h3 className="font-heading text-xl text-foreground">YOUR VOTING ADDRESS</h3>
        <p className="text-xs text-muted-foreground">
          We use your address to find your exact polling location and personalize your ballot information.
        </p>

        {!editingAddress ? (
          <div className="flex items-start justify-between gap-3">
            {currentFullAddress ? (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-sm text-foreground leading-relaxed">
                  {addressLine1 && <p>{addressLine1}</p>}
                  {addressLine2 && <p>{addressLine2}</p>}
                  <p>{[addressCity, addressState, addressZip].filter(Boolean).join(", ").replace(", ", ", ").replace(addressState + ", " + addressZip, addressState + " " + addressZip)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No voting address set</p>
            )}
            <Button variant="ghost" size="sm" onClick={() => setEditingAddress(true)} className="gap-1.5 text-xs shrink-0">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Street Address <span className="text-destructive">*</span>
              </label>
              <Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="123 Main Street"
                className="bg-background border-border text-base" maxLength={100} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Apt / Suite (optional)</label>
              <Input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Apt 4B, Suite 200..."
                className="bg-background border-border text-base" maxLength={50} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_40%] gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  City <span className="text-destructive">*</span>
                </label>
                <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="Kansas City"
                  className="bg-background border-border text-base" maxLength={50} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  State <span className="text-destructive">*</span>
                </label>
                <Select value={addressState} onValueChange={setAddressState}>
                  <SelectTrigger className="bg-background border-border text-base">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {US_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="md:w-[40%]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                ZIP Code <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input value={addressZip} onChange={(e) => setAddressZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  inputMode="numeric" maxLength={5} placeholder="64139"
                  className={`bg-background pr-10 text-base ${isZipValid ? "border-primary/50" : "border-border"}`} />
                {isZipValid && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button onClick={handleSaveAddress} disabled={!addressIsValid || savingAddress} size="sm" className="gap-1.5">
                {savingAddress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save Address
              </Button>
              <button onClick={() => setEditingAddress(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="rounded-xl p-6 space-y-4" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
        <h3 className="font-heading text-xl text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> NOTIFICATIONS
        </h3>
        {toggleItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {savedToggle === item.key && (
                  <motion.span initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="text-[10px] text-primary font-semibold">Saved</motion.span>
                )}
              </AnimatePresence>
              <button onClick={() => { const newVal = !item.value; item.setter(newVal); handleToggle(item.key, newVal); }}
                className={`h-6 w-10 rounded-full relative transition-colors ${item.value ? "bg-primary" : "bg-muted"}`}>
                <motion.div animate={{ x: item.value ? 16 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="h-4 w-4 bg-white rounded-full absolute top-1" />
              </button>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-xl p-6 space-y-4" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
        <h3 className="font-heading text-xl text-foreground flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" /> SECURITY
        </h3>
        <Button variant="outline" onClick={() => { setShowPasswordModal(true); setPasswordError(""); setNewPassword(""); setConfirmPassword(""); }} className="gap-1.5">
          <Lock className="h-4 w-4" /> Change Password
        </Button>
      </motion.div>

      {/* Install Desktop App */}
      {isSupported && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          className="rounded-xl p-6 space-y-3" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
          <h3 className="font-heading text-xl text-foreground flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" /> DESKTOP APP
          </h3>
          <p className="text-sm text-muted-foreground">Install UWAZI.AI as a desktop app for quick access and offline support.</p>
          {isInstalled ? (
            <div className="flex items-center gap-2 text-sm text-primary"><Check className="h-4 w-4" /> App Installed</div>
          ) : (
            <Button onClick={install} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="h-4 w-4" /> Install UWAZI.AI on Desktop
            </Button>
          )}
        </motion.div>
      )}

      {/* Sign Out */}
      <Button variant="outline" onClick={handleSignOut} className="w-full border-border gap-1.5">
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>

      {/* Danger Zone */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="rounded-xl p-6 border border-destructive/30 space-y-4" style={{ background: "var(--card-bg)" }}>
        <h3 className="font-heading text-xl text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> DANGER ZONE
        </h3>
        <p className="text-sm text-muted-foreground">Permanently delete your account and all associated civic data. This action cannot be undone.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 gap-1.5">
              <Trash2 className="h-4 w-4" /> Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete your account and all civic data. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} disabled={deletingAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5">
                {deletingAccount && <Loader2 className="h-4 w-4 animate-spin" />} Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading text-2xl">CHANGE PASSWORD</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">New Password</label>
              <div className="relative">
                <Input type={showNewPassword ? "text" : "password"} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" className="bg-background border-border pr-10" />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password" className="bg-background border-border" />
            </div>
            {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)} className="border-border">Cancel</Button>
              <Button type="submit" disabled={savingPassword} className="bg-primary text-primary-foreground gap-1.5">
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {savingPassword ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
