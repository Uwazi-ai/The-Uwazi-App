import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import uwaziLogo from "@/assets/uwazi-logo.png";
import { Mail, Lock, User, Eye, EyeOff, AlertTriangle } from "lucide-react";

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgSlug = searchParams.get("org") || "";
  const token = searchParams.get("token") || "";

  const [invite, setInvite] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "valid" | "expired" | "invalid">("loading");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validate invite
  useEffect(() => {
    async function validate() {
      if (!token) { setStatus("invalid"); return; }
      const { data: inv } = await supabase
        .from("org_invites" as any)
        .select("*, partner_orgs:org_id(*)")
        .eq("token", token)
        .maybeSingle();

      if (!inv) { setStatus("invalid"); return; }
      if ((inv as any).accepted_at) { setStatus("expired"); return; }
      if (new Date((inv as any).expires_at) < new Date()) { setStatus("expired"); return; }

      setInvite(inv);
      setOrg((inv as any).partner_orgs);
      setEmail((inv as any).email || "");
      setStatus("valid");
    }
    validate();
  }, [token]);

  // If user is already logged in, complete join
  useEffect(() => {
    if (user && status === "valid" && invite) {
      completeJoin(user.id);
    }
  }, [user, status, invite]);

  const completeJoin = async (userId: string) => {
    try {
      // Mark invite accepted
      await supabase
        .from("org_invites" as any)
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      // Create membership
      await supabase.from("org_members" as any).upsert({
        org_id: invite.org_id,
        user_id: userId,
        role: invite.role || "member",
        status: "active",
        invited_by: invite.invited_by,
      }, { onConflict: "org_id,user_id" });

      // Set profile org_role via raw fetch — SDK strips unknown typed keys
      const orgRole = invite.role === "admin" ? "org_admin" : "org_member";
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ org_role: orgRole }),
      });

      toast.success(`Welcome to ${org?.name}!`);
      navigate("/partner-dashboard");
    } catch {
      toast.error("Something went wrong joining the organization");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.href },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data.user) {
      // Will be handled by the useEffect above
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href });
    if (result.error) { toast.error("Google sign-in failed"); setLoading(false); }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-semibold">Validating invite...</div>
      </div>
    );
  }

  if (status === "invalid" || status === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="max-w-md p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-axis text-foreground">
              {status === "expired" ? "Invite Expired" : "Invalid Invite"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {status === "expired"
                ? "This invite link has expired. Ask your org admin for a new one."
                : "This invite link is invalid. Please check the URL or contact your org admin."}
            </p>
            <Link to="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    );
  }

  // If user is logged in, show a joining message
  if (user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-semibold">Joining {org?.name}...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <img src={uwaziLogo} alt="UWAZI.AI" className="h-12 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">You've been invited!</h1>
          <p className="text-muted-foreground text-sm">
            Join <span className="text-primary font-semibold">{org?.name}</span> on UWAZI
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="flex gap-2">
            <Button
              variant={mode === "signup" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("signup")}
            >
              Sign Up
            </Button>
            <Button
              variant={mode === "login" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("login")}
            >
              Log In
            </Button>
          </div>

          <Button variant="outline" className="w-full h-12" onClick={handleGoogleSignIn} disabled={loading}>
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">or</span></div>
          </div>

          <form onSubmit={mode === "signup" ? handleSignup : handleLogin} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 h-11" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10 h-11" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10 pr-10 h-11"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "signup" ? 6 : 1}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "Please wait..." : mode === "signup" ? "Create Account & Join" : "Log In & Join"}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
