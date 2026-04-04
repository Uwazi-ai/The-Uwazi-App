import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import uwaziIcon from "@/assets/uwazi-icon.png";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, BookOpen, Heart, Layers, Check, ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to UWAZI.AI",
    subtitle: "Your personal civic intelligence companion. Let's personalize your experience.",
    icon: null,
  },
  {
    id: "location",
    title: "Where are you located?",
    subtitle: "This helps us show you relevant local information.",
    icon: MapPin,
    field: "location",
    options: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
      "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
      "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
      "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
      "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
      "New Hampshire", "New Jersey", "New Mexico", "New York",
      "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
      "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
      "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
      "West Virginia", "Wisconsin", "Wyoming", "Washington D.C.",
    ],
    type: "select" as const,
  },
  {
    id: "knowledge",
    title: "How would you describe your civic knowledge?",
    subtitle: "No wrong answers — we'll meet you where you are.",
    icon: BookOpen,
    field: "civic_knowledge_level",
    options: [
      { value: "beginner", label: "Just getting started", desc: "New to politics and civic life" },
      { value: "intermediate", label: "Know the basics", desc: "Familiar with major topics" },
      { value: "advanced", label: "Civically engaged", desc: "Actively follow politics and policy" },
    ],
    type: "choice" as const,
  },
  {
    id: "interests",
    title: "What issues matter most to you?",
    subtitle: "Select all that apply. You can change these later.",
    icon: Heart,
    field: "issue_interests",
    options: [
      "Elections & Voting", "Education", "Healthcare", "Economy & Jobs",
      "Housing", "Environment", "Public Safety", "Civil Rights",
      "Immigration", "Technology & Privacy", "Local Government",
      "Transportation", "Social Services", "Foreign Policy",
    ],
    type: "multi" as const,
  },
  {
    id: "depth",
    title: "How deep do you like to go?",
    subtitle: "Choose your preferred reading depth for civic content.",
    icon: Layers,
    field: "content_depth",
    options: [
      { value: "brief", label: "Quick bites", desc: "Headlines and key takeaways" },
      { value: "standard", label: "Balanced", desc: "Summaries with context" },
      { value: "detailed", label: "Deep dives", desc: "Full analysis and sources" },
    ],
    type: "choice" as const,
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({
    location: "",
    civic_knowledge_level: "",
    issue_interests: [] as string[],
    content_depth: "standard",
  });

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase
        .from("profiles")
        .update({
          location: answers.location,
          civic_knowledge_level: answers.civic_knowledge_level,
          onboarding_complete: true,
        })
        .eq("user_id", user.id);

      await supabase
        .from("user_preferences")
        .update({
          issue_interests: answers.issue_interests,
          content_depth: answers.content_depth,
        })
        .eq("user_id", user.id);

      toast.success("You're all set! Welcome to UWAZI.AI");
      navigate("/");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setAnswers((prev) => ({
      ...prev,
      issue_interests: prev.issue_interests.includes(interest)
        ? prev.issue_interests.filter((i: string) => i !== interest)
        : [...prev.issue_interests, interest],
    }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Progress */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border"
          >
            {/* Welcome step */}
            {currentStep.id === "welcome" && (
              <div className="text-center space-y-6 py-8">
                <img src={uwaziIcon} alt="UWAZI.AI" className="h-20 w-20 mx-auto" />
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-foreground">{currentStep.title}</h1>
                  <p className="text-muted-foreground">{currentStep.subtitle}</p>
                </div>
              </div>
            )}

            {/* Select step (location) */}
            {currentStep.type === "select" && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  {currentStep.icon && <currentStep.icon className="h-6 w-6 text-primary" />}
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{currentStep.title}</h2>
                    <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {(currentStep.options as string[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [currentStep.field!]: opt }))}
                      className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        answers[currentStep.field!] === opt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Choice step */}
            {currentStep.type === "choice" && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  {currentStep.icon && <currentStep.icon className="h-6 w-6 text-primary" />}
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{currentStep.title}</h2>
                    <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {(currentStep.options as { value: string; label: string; desc: string }[]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAnswers((p) => ({ ...p, [currentStep.field!]: opt.value }))}
                      className={`w-full text-left px-4 py-4 rounded-xl transition-all border flex items-center gap-4 ${
                        answers[currentStep.field!] === opt.value
                          ? "bg-primary/10 border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        answers[currentStep.field!] === opt.value ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {answers[currentStep.field!] === opt.value && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{opt.label}</p>
                        <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-select step */}
            {currentStep.type === "multi" && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  {currentStep.icon && <currentStep.icon className="h-6 w-6 text-primary" />}
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{currentStep.title}</h2>
                    <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(currentStep.options as string[]).map((opt) => {
                    const selected = answers.issue_interests.includes(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() => toggleInterest(opt)}
                        className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all border ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5 inline mr-1.5" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={handleBack} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={handleNext} disabled={loading} className="gap-1.5 min-w-[120px]">
            {loading ? "Saving…" : isLast ? "Get Started" : "Continue"}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Skip */}
        {step > 0 && !isLast && (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip this step
          </button>
        )}
      </div>
    </div>
  );
}
