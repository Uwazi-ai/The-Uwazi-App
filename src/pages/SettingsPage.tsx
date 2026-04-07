import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, MapPin, Bell, Camera, Save, LogOut, Lock, Trash2,
  Check, X, Loader2, Eye, EyeOff, AlertTriangle, ChevronLeft, Download, Monitor,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePWAInstall } from "@/components/PWAInstallPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface ProfileData {
  display_name: string | null;
  zip_code: string | null;
  street_address: string | null;
  avatar_url: string | null;
  notify_elections: boolean;
  notify_new_lessons: boolean;
  notify_streak_reminders: boolean;
  notify_civic_alerts: boolean;
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { refreshProfile } = useProfile();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Location
  const [zipCode, setZipCode] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [zipTouched, setZipTouched] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

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

  const isZipValid = /^\d{5}$/.test(zipCode);
  const showZipError = zipTouched && zipCode.length > 0 && !isZipValid;

  // Load profile data
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("display_name, zip_code, street_address, avatar_url, notify_elections, notify_new_lessons, notify_streak_reminders, notify_civic_alerts")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setDisplayName(data.display_name || "");
        setZipCode(data.zip_code || "");
        setStreetAddress(data.street_address || "");
        setAvatarUrl(data.avatar_url);
        setNotifyElections(data.notify_elections ?? true);
        setNotifyNewLessons(data.notify_new_lessons ?? true);
        setNotifyStreakReminders(data.notify_streak_reminders ?? true);
        setNotifyCivicAlerts(data.notify_civic_alerts ?? true);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  // Avatar upload
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Instant preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Bust cache with timestamp
      const freshUrl = `${publicUrl}?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ avatar_url: freshUrl })
        .eq("user_id", user.id);

      setAvatarUrl(freshUrl);
      setAvatarPreview(null);
      toast.success("Profile photo updated ✓");
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!displayName.trim()) {
      setNameError("Display name is required");
      return;
    }
    setNameError("");
    setSavingProfile(true);
    await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("user_id", user.id);
    setSavingProfile(false);
    toast.success("Profile updated ✓");
    refreshProfile();
  };

  // Save location
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isZipValid) {
      setZipTouched(true);
      return;
    }
    setSavingLocation(true);
    await supabase
      .from("profiles")
      .update({
        zip_code: zipCode.trim(),
        street_address: streetAddress.trim() || null,
      })
      .eq("user_id", user.id);
    setSavingLocation(false);
    toast.success("Civic location updated ✓");
  };

  // Notification toggle
  const handleToggle = useCallback(
    async (key: string, value: boolean) => {
      if (!user) return;
      const updateObj: Record<string, boolean> = { [key]: value };
      await supabase.from("profiles").update(updateObj).eq("user_id", user.id);
      setSavedToggle(key);
      setTimeout(() => setSavedToggle(null), 1500);
    },
    [user]
  );

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated ✓");
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      await signOut();
      navigate("/login");
      toast.success("Your account has been deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeletingAccount(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  const currentAvatar = avatarPreview || avatarUrl;
  const initials = displayName?.[0]?.toUpperCase() || "U";

  const toggleItems = [
    {
      key: "notify_elections",
      label: "Election reminders",
      desc: "Get notified about upcoming elections",
      value: notifyElections,
      setter: setNotifyElections,
    },
    {
      key: "notify_new_lessons",
      label: "New lesson available",
      desc: "When new civic lessons are available",
      value: notifyNewLessons,
      setter: setNotifyNewLessons,
    },
    {
      key: "notify_streak_reminders",
      label: "Streak reminders",
      desc: "Don't break your learning streak",
      value: notifyStreakReminders,
      setter: setNotifyStreakReminders,
    },
    {
      key: "notify_civic_alerts",
      label: "Civic alerts for my ZIP",
      desc: "Alerts about civic events in your area",
      value: notifyCivicAlerts,
      setter: setNotifyCivicAlerts,
    },
  ];

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8 pb-28 md:pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="eyebrow mb-1">SETTINGS</p>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground leading-none">YOUR PROFILE.</h1>
        </div>
      </motion.div>

      {/* Avatar Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex items-center gap-4"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <button
          onClick={handleAvatarClick}
          className="relative h-20 w-20 rounded-full shrink-0 group overflow-hidden"
          disabled={uploadingAvatar}
        >
          {currentAvatar ? (
            <img src={currentAvatar} alt="Avatar" className="h-full w-full object-cover rounded-full" />
          ) : (
            <div className="h-full w-full rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
              {initials}
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadingAvatar ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </div>
        </button>
        <div>
          <p className="text-lg font-bold text-foreground">{displayName || "User"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <button onClick={handleAvatarClick} className="text-xs text-primary hover:underline mt-0.5">
            Change Photo
          </button>
        </div>
      </motion.div>

      {/* Profile Fields */}
      <motion.form
        onSubmit={handleSaveProfile}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-xl p-6 border border-border space-y-4"
      >
        <h3 className="font-heading text-xl text-foreground">PROFILE INFO</h3>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Display Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setNameError(""); }}
            className={`bg-background border-border ${nameError ? "border-destructive" : ""}`}
            placeholder="Your name"
          />
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

      {/* Civic Location */}
      <motion.form
        onSubmit={handleSaveLocation}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl p-6 border border-border space-y-4"
      >
        <h3 className="font-heading text-xl text-foreground">YOUR CIVIC LOCATION</h3>
        {zipCode && isZipValid && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/15 rounded-full w-fit">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">📍 {zipCode}</span>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            ZIP Code <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Input
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              onBlur={() => setZipTouched(true)}
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 64110"
              className={`bg-background pr-10 ${
                showZipError ? "border-destructive" : isZipValid ? "border-primary/50" : "border-border"
              }`}
            />
            {isZipValid && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />}
          </div>
          {showZipError && <p className="text-xs text-destructive mt-1">Please enter a valid 5-digit ZIP code</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Street Address (optional)
          </label>
          <Input
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            placeholder="123 Main St"
            className="bg-background border-border"
          />
        </div>
        <Button type="submit" disabled={savingLocation || !isZipValid} className="bg-primary text-primary-foreground gap-1.5">
          {savingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {savingLocation ? "Saving..." : "Save Location"}
        </Button>
      </motion.form>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-card rounded-xl p-6 border border-border space-y-4"
      >
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
                  <motion.span
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] text-primary font-semibold"
                  >
                    Saved
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                onClick={() => {
                  const newVal = !item.value;
                  item.setter(newVal);
                  handleToggle(item.key, newVal);
                }}
                className={`h-6 w-10 rounded-full relative transition-colors ${
                  item.value ? "bg-primary" : "bg-muted"
                }`}
              >
                <motion.div
                  animate={{ x: item.value ? 16 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="h-4 w-4 bg-white rounded-full absolute top-1"
                />
              </button>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card rounded-xl p-6 border border-border space-y-4"
      >
        <h3 className="font-heading text-xl text-foreground flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" /> SECURITY
        </h3>
        <Button
          variant="outline"
          onClick={() => { setShowPasswordModal(true); setPasswordError(""); setNewPassword(""); setConfirmPassword(""); }}
          className="gap-1.5"
        >
          <Lock className="h-4 w-4" /> Change Password
        </Button>
      </motion.div>

      {/* Install Desktop App */}
      {(() => {
        const { isInstalled, install, isSupported } = usePWAInstall();
        if (!isSupported) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
            className="bg-card rounded-xl p-6 border border-border space-y-3"
          >
            <h3 className="font-heading text-xl text-foreground flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" /> DESKTOP APP
            </h3>
            <p className="text-sm text-muted-foreground">
              Install UWAZI.AI as a desktop app for quick access and offline support.
            </p>
            {isInstalled ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Check className="h-4 w-4" /> App Installed
              </div>
            ) : (
              <Button
                onClick={install}
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-4 w-4" /> Install UWAZI.AI on Desktop
              </Button>
            )}
          </motion.div>
        );
      })()}

      {/* Sign Out */}
      <Button variant="outline" onClick={handleSignOut} className="w-full border-border gap-1.5">
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-card rounded-xl p-6 border border-destructive/30 space-y-4"
      >
        <h3 className="font-heading text-xl text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> DANGER ZONE
        </h3>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated civic data. This action cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 gap-1.5">
              <Trash2 className="h-4 w-4" /> Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all civic data. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
              >
                {deletingAccount && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Account
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="bg-background border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Confirm Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="bg-background border-border"
              />
            </div>
            {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)} className="border-border">
                Cancel
              </Button>
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
