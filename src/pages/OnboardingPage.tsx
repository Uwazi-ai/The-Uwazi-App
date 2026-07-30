import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { promoReturnPath } from "@/lib/pendingPromo";
import uwaziLogo from "@/assets/uwazi-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import AddressStep, { type AddressData } from "@/components/onboarding/AddressStep";
import NameStep from "@/components/onboarding/NameStep";
import RegistrationCheckStep from "@/components/onboarding/RegistrationCheckStep";
import RedemptionCodeStep from "@/components/onboarding/RedemptionCodeStep";
import { TrustBanner } from "@/components/onboarding/TrustBanner";
import { getStoredOrgSlug, clearStoredOrgSlug } from "@/hooks/useOrgTracking";

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const prefilledCode = searchParams.get("code") || "";
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [returning, setReturning] = useState(false);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState<AddressData>({
    address_line1: "",
    address_line2: "",
    city: "",
    state_code: "",
    zip_code: "",
  });

  // Prefill from existing profile + detect "returning skipper" who needs ZIP
  useEffect(() => {
    if (!user) return;
    (supabase.from("profiles") as any)
      .select("display_name,address_line1,address_line2,city,state_code,zip_code,onboarding_complete")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (!data) return;
        if (data.display_name) setFullName(data.display_name);
        setAddress((prev) => ({
          ...prev,
          address_line1: data.address_line1 || prev.address_line1,
          address_line2: data.address_line2 || prev.address_line2,
          city: data.city || prev.city,
          state_code: data.state_code || prev.state_code,
          zip_code: data.zip_code || prev.zip_code,
        }));
        // Existing user with name but no ZIP → skip to address step
        const needsZip = !data.zip_code || `${data.zip_code}`.trim() === "";
        if (data.onboarding_complete && needsZip && data.display_name) {
          setReturning(true);
          setStep(1);
        }
      });
  }, [user]);

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));

  const handleNameSubmit = async (name: string) => {
    if (!user) return;
    setLoading(true);
    try {
      setFullName(name);
      await (supabase.from("profiles") as any)
        .update({ display_name: name })
        .eq("user_id", user.id);
      goNext();
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async (data: AddressData) => {
    if (!user) return;
    setLoading(true);
    try {
      setAddress(data);
      const fullAddress = `${data.address_line1}${data.address_line2 ? " " + data.address_line2 : ""}, ${data.city}, ${data.state_code} ${data.zip_code}`;
      await (supabase.from("profiles") as any)
        .update({
          address_line1: data.address_line1,
          address_line2: data.address_line2 || null,
          city: data.city,
          state_code: data.state_code,
          zip_code: data.zip_code,
          full_address: fullAddress,
          street_address: data.address_line1,
        })
        .eq("user_id", user.id);
      goNext();
    } catch {
      toast.error("Could not save address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const referredOrg = getStoredOrgSlug();
      const profileUpdate: Record<string, any> = {
        onboarding_complete: true,
        registration_checked_at: new Date().toISOString(),
      };
      if (referredOrg) profileUpdate.referred_by_org = referredOrg;

      await (supabase.from("profiles") as any)
        .update(profileUpdate)
        .eq("user_id", user.id);

      if (referredOrg) {
        const { data: org } = await supabase
          .from("partner_orgs" as any)
          .select("id")
          .eq("slug", referredOrg)
          .maybeSingle();
        if (org) {
          await supabase.from("org_registrations" as any).insert({
            org_id: (org as any).id,
            user_id: user.id,
            event_type: "uwazi_signup",
          });
        }
        clearStoredOrgSlug();
      }

      toast.success("You're all set! Welcome to UWAZI.AI 🗳️");
      navigate(promoReturnPath("/app"));
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "#080808" }}
    >
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <img src={uwaziLogo} alt="UWAZI.AI" className="h-10 mx-auto" />

        {/* Progress */}
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors duration-300"
              style={{ background: i <= step ? "#9BD34B" : "rgba(255,255,255,0.1)" }}
            />
          ))}
        </div>

        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="p-6 md:p-8">
            {returning && step === 1 && (
              <p
                className="mb-4 text-center"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#aaa" }}
              >
                We need your ZIP code to personalize your experience. This helps us show
                you local elections, representatives, and civic opportunities.
              </p>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={step}>
                {step === 0 && (
                  <NameStep initial={fullName} onSubmit={handleNameSubmit} loading={loading} />
                )}
                {step === 1 && (
                  <AddressStep
                    initial={address}
                    onSubmit={handleAddressSubmit}
                    onSkip={() => {}}
                    loading={loading}
                  />
                )}
                {step === 2 && (
                  <RedemptionCodeStep
                    initial={prefilledCode}
                    onDone={goNext}
                    loading={loading}
                  />
                )}
                {step === 3 && (
                  <RegistrationCheckStep onContinue={handleComplete} loading={loading} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <TrustBanner />
        </div>
      </div>
    </div>
  );
}
