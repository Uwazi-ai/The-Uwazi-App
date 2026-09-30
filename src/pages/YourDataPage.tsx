import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Trash2, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const db = supabase as any;

const STORED = [
  { t: "Compass answers and scores", d: "How you answered each Compass statement and the scores we worked out from them." },
  { t: "Your $100 split", d: "How you spread $100 across city needs." },
  { t: "Identity label", d: "The short name for what you care about most." },
  { t: "Points and badges", d: "What you earned for lessons, quizzes, surveys, and actions." },
  { t: "Confidence score", d: "How sure you said you feel about local issues." },
  { t: "Lessons done", d: "Which lessons you finished and your quiz scores." },
  { t: "Survey answers", d: "What you said in surveys you chose to answer." },
  { t: "District codes", d: "The district numbers for your address. We keep the codes, not the address itself." },
];

export default function YourDataPage() {
  const [consent, setConsent] = useState({ personalization: false, research: false });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await db.rpc("get_my_journey");
    setConsent({ personalization: !!data?.personalization, research: !!data?.research });
  };
  useEffect(() => { load(); }, []);

  const toggle = async (key: "personalization" | "research", on: boolean) => {
    setConsent((c) => ({ ...c, [key]: on }));
    const { error } = await db.rpc("set_my_consent", key === "personalization" ? { _personalization: on } : { _research: on });
    if (error) { toast.error("We could not save that. Try again."); load(); return; }
    toast.success(on ? "Turned on." : "Turned off.");
  };

  const download = async () => {
    setBusy(true);
    const { data, error } = await db.rpc("export_my_data");
    setBusy(false);
    if (error || !data) return toast.error("We could not build your file. Try again.");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `uwazi-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const deleteCompass = async () => {
    setBusy(true);
    const { error } = await db.rpc("delete_my_compass_data");
    setBusy(false);
    if (error) return toast.error("We could not delete it. Try again.");
    toast.success("Your Compass data is gone. Your points, badges, and lessons are still here.");
    load();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8 space-y-6 overflow-x-hidden">
      <Link to="/app/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>
      <div>
        <h1 className="font-heading text-3xl text-foreground">Your data</h1>
        <p className="text-sm text-muted-foreground mt-1">Here is everything UWAZI keeps about you. You are in charge of it.</p>
      </div>

      <section className="rounded-2xl bg-card border border-border divide-y divide-border">
        {STORED.map((s) => (
          <div key={s.t} className="p-4">
            <p className="font-semibold text-foreground text-sm">{s.t}</p>
            <p className="text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-foreground">Your choices</h2>
        <label className="flex items-start justify-between gap-4 rounded-2xl bg-card border border-border p-4 cursor-pointer">
          <div>
            <p className="font-semibold text-sm text-foreground">Personalize my UWAZI</p>
            <p className="text-sm text-muted-foreground">We use your Compass to pick lessons and next steps for you.</p>
          </div>
          <Switch checked={consent.personalization} onCheckedChange={(v) => toggle("personalization", v)} aria-label="Personalize my UWAZI" data-testid="consent-personalization" />
        </label>
        <label className="flex items-start justify-between gap-4 rounded-2xl bg-card border border-border p-4 cursor-pointer">
          <div>
            <p className="font-semibold text-sm text-foreground">Help civic research</p>
            <p className="text-sm text-muted-foreground">Your answers join group totals with no name attached.</p>
          </div>
          <Switch checked={consent.research} onCheckedChange={(v) => toggle("research", v)} aria-label="Help civic research" />
        </label>
      </section>

      <section className="space-y-3">
        <Button className="w-full" onClick={download} disabled={busy} data-testid="download-data"><Download className="h-4 w-4 mr-1" /> Download my data</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full" disabled={busy} data-testid="delete-compass"><Trash2 className="h-4 w-4 mr-1" /> Delete my Compass data</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your Compass data?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes your Compass answers, scores, $100 split, identity label, and confidence score. You cannot undo it. Your points, badges, and lessons stay.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={deleteCompass} data-testid="confirm-delete-compass">Yes, delete it</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="text-xs text-muted-foreground">Points, badges, and lesson history stay. They come from things you did, so they are yours to keep.</p>
      </section>

      <section className="rounded-2xl border border-primary/30 bg-primary/10 p-5 space-y-3">
        <p className="font-semibold text-foreground">Have a question about your data?</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild><Link to={`/app/ask?q=${encodeURIComponent("What does UWAZI do with my data?")}`}><MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI</Link></Button>
          <Button asChild variant="outline"><Link to="/fair"><ShieldCheck className="h-4 w-4 mr-1" /> How UWAZI stays fair</Link></Button>
        </div>
      </section>
    </div>
  );
}
