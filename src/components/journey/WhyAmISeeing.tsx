import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Info, Compass, MessageCircle, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { dimMeta, topSlugs } from "@/lib/compassDims";

const db = supabase as any;

/** Small "Why am I seeing this?" link that explains a personalized item. */
export function WhyAmISeeing({ rule, onChanged, className = "" }: { rule: string; onChanged?: () => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<{ personalization: boolean; label: string | null; scores: Record<string, number> | null } | null>(null);
  const [turnedOff, setTurnedOff] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTurnedOff(false);
    db.rpc("get_my_journey").then(({ data }: any) =>
      setInfo({ personalization: !!data?.personalization, label: data?.label ?? null, scores: data?.dimension_scores ?? null }));
  }, [open]);

  const turnOff = async () => {
    setBusy(true);
    const { error } = await db.rpc("set_my_consent", { _personalization: false });
    setBusy(false);
    if (error) return;
    setTurnedOff(true);
    onChanged?.();
  };

  const top = topSlugs(info?.scores, 3);

  return (
    <>
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center gap-1 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground ${className}`}
        data-testid="why-link">
        <Info className="h-3 w-3" /> Why am I seeing this?
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto" data-testid="why-sheet">
          <SheetHeader className="text-left">
            <SheetTitle>Why am I seeing this?</SheetTitle>
            <SheetDescription>We picked this for you based on your Civic Compass.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4 text-sm">
            {turnedOff ? (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex gap-2" data-testid="why-off">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-foreground">Personalization is off. You will now see the same picks as everyone. You can turn it back on in Your data.</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Your identity</p>
                  <p className="font-semibold text-foreground">{info?.label ?? "No identity yet"}</p>
                </div>
                {top.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Your top issues</p>
                    <ul className="space-y-1">
                      {top.map((s) => { const m = dimMeta(s); return (
                        <li key={s} className="flex items-center gap-2 text-foreground">
                          <m.Icon className="h-4 w-4" style={{ color: m.color }} /> {m.short}
                          <span className="text-muted-foreground">{Math.round((info?.scores?.[s] ?? 0) * 100)} out of 100</span>
                        </li>); })}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">How we picked it</p>
                  <p className="text-foreground">{rule}</p>
                </div>
              </>
            )}
            <div className="flex flex-col gap-2 pt-2">
              {!turnedOff && info?.personalization && (
                <Button variant="outline" onClick={turnOff} disabled={busy} data-testid="why-turn-off">Turn off personalization</Button>
              )}
              <Button asChild><Link to="/app/compass" onClick={() => setOpen(false)}><Compass className="h-4 w-4 mr-1" /> Retake the Compass test</Link></Button>
              <Button asChild variant="ghost">
                <Link to={`/app/ask?q=${encodeURIComponent("How does UWAZI pick things for me?")}`} onClick={() => setOpen(false)}><MessageCircle className="h-4 w-4 mr-1" /> Ask UWAZI</Link>
              </Button>
              <Link to="/fair" className="text-xs text-center text-muted-foreground underline" onClick={() => setOpen(false)}>How UWAZI stays fair</Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
