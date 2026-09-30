import { useEffect, useRef, useState } from "react";
import { Camera, Share2, Trash2, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CompassRose } from "./CompassRose";
import { dimMeta, stageColor, topSlugs } from "@/lib/compassDims";
import { useMyBadges } from "@/hooks/useChallenge";
import { BadgeRow } from "@/components/games/BadgeRow";
import { usePersonas, shortName } from "@/lib/personas";
import { PersonaBadge } from "./PersonaBadge";
import { TiltCard, captureFlat } from "./TiltCard";

const db = supabase as any;
const BUCKET = "identity-photos";

interface Props {
  label: string | null;
  persona?: string | null;
  streak?: string | null;
  scores: Record<string, number>;
  stage: string | null;
  fallbackTitle?: string;
}

export function IdentityCard({ label, persona, streak, scores, stage, fallbackTitle }: Props) {
  const { bySlug } = usePersonas();
  const pp = bySlug(persona);
  const ps = bySlug(streak);
  const [back, setBack] = useState(false);
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [city, setCity] = useState<string | null>(null);
  const [since, setSince] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const badges = useMyBadges();
  const path = user ? `${user.id}/photo` : "";

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await db.from("profiles").select("city, voter_address_city, created_at").eq("user_id", user.id).maybeSingle();
      setCity(p?.city || p?.voter_address_city || null);
      const d = p?.created_at ?? user.created_at;
      if (d) setSince(new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" }));
      const { data: blob } = await supabase.storage.from(BUCKET).download(path);
      if (blob) setPhoto(URL.createObjectURL(blob));
    })();
  }, [user, path]);

  const tops = topSlugs(scores, 3).map(dimMeta);
  // Resolve theme colors to plain values so the shared picture matches the screen.
  const resolve = (c: string, alpha = 1) => {
    const m = c.match(/var\((--[\w-]+)\)/);
    const v = m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() : "";
    return v ? `hsl(${v} / ${alpha})` : c;
  };
  const frame = resolve(stageColor(stage));
  const card = resolve("hsl(var(--card))");
  // Persona tint at 12 percent over the card surface. Resolved so the shared picture matches.
  const pColor = pp ? resolve(`hsl(var(--persona-${pp.color}))`, 0.12) : null;
  const bg = pColor
    ? `linear-gradient(${pColor}, ${pColor}), ${card}`
    : tops.length
    ? `linear-gradient(145deg, ${resolve(tops[0].color, 0.3)}, ${card} 55%, ${resolve((tops[1] ?? tops[0]).color, 0.22)})`
    : card;

  const upload = async (f: File) => {
    if (!user) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("That photo is too big. Pick one under 5 MB.");
    setBusy(true);
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { upsert: true, contentType: f.type });
    setBusy(false);
    if (error) return toast.error("We could not add your photo. Try again.");
    setPhoto(URL.createObjectURL(f));
    toast.success("Photo added. Only you can see it.");
  };

  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    setBusy(false);
    if (error) return toast.error("We could not remove your photo. Try again.");
    setPhoto(null);
    toast.success("Photo removed.");
  };

  const share = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const canvas = await captureFlat(cardRef.current);
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("no image");
      const file = new File([blob], "my-uwazi-card.png", { type: "image/png" });
      const nav = navigator as any;
      if (nav.canShare?.({ files: [file] }) && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await nav.share({ files: [file], title: "My UWAZI card" });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "my-uwazi-card.png";
        a.click();
        toast.success("Your card was saved to your device.");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("We could not make the picture. Try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <TiltCard ref={cardRef} data-testid="identity-card" className="rounded-3xl p-1" style={{ background: frame }}>
        {back && pp ? (
        <div className="rounded-[20px] p-5 space-y-4 min-h-[420px] flex flex-col justify-center text-center" style={{ background: bg }} data-testid="identity-card-back">
          <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground">YOUR TRADITION</p>
          <PersonaBadge slug={pp.slug} size="chip" label={`${pp.name} badge`} className="mx-auto" />
          <h3 className="font-heading text-2xl leading-tight" style={{ color: resolve(`hsl(var(--persona-${pp.color}))`) }}>{pp.name}</h3>
          {pp.archetype_intro && <p className="text-base text-foreground" data-testid="card-archetype">{pp.archetype_intro}</p>}
          <p className="text-sm text-muted-foreground">{pp.strength}</p>
          <p className="text-sm text-muted-foreground">Watch for this. {pp.blind_spot}</p>
        </div>
        ) : (
        <div className="rounded-[20px] p-5 space-y-4" style={{ background: bg }}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground">YOUR CIVIC PERSONA</p>
            {stage && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-background" style={{ background: frame }}>{stage}</span>}
          </div>
          <div className="flex items-center gap-4">
            {photo && <img src={photo} alt="You" className="h-16 w-16 rounded-full object-cover border-2" style={{ borderColor: frame }} />}
            {pp && <PersonaBadge slug={pp.slug} size="chip" label={`${pp.name} badge`} className="shrink-0" />}
            <div className="min-w-0">
              <h3 className="font-heading text-2xl leading-tight" data-testid="card-headline" style={{ color: pp ? resolve(`hsl(var(--persona-${pp.color}))`) : undefined }}>{pp?.name ?? label ?? fallbackTitle ?? "Civic Compass"}</h3>
              {ps && <p className="text-sm font-semibold" data-testid="card-streak" style={{ color: resolve(`hsl(var(--persona-${ps.color}))`) }}>with a {shortName(ps)} streak</p>}
              {city && <p className="text-sm text-muted-foreground">{city}</p>}
            </div>
          </div>
          <div className="flex justify-center"><CompassRose scores={scores} size={200} highlight={tops.map((t) => t.slug)} /></div>
          <div className="flex flex-wrap gap-2 justify-center">
            {tops.map((t) => (
              <span key={t.slug} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-background/60 text-foreground">
                <t.Icon className="h-3.5 w-3.5" style={{ color: t.color }} /> {t.short}
              </span>
            ))}
          </div>
          {badges.length > 0 && (
            <div className="flex justify-center"><BadgeRow badges={badges.slice(0, 4)} compact /></div>
          )}
          {since && <p className="text-xs text-center text-muted-foreground">Member since {since}</p>}
        </div>
        )}
      </TiltCard>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      <div className="flex flex-wrap gap-2 justify-center">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Camera className="h-4 w-4 mr-1" /> {photo ? "Change photo" : "Add a photo"}
        </Button>
        {photo && <Button size="sm" variant="ghost" disabled={busy} onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Remove photo</Button>}
        {pp && <Button size="sm" variant="outline" onClick={() => setBack((b) => !b)} data-testid="flip-card"><RotateCw className="h-4 w-4 mr-1" /> {back ? "Show the front" : "Turn the card"}</Button>}
        <Button size="sm" disabled={busy} onClick={share}><Share2 className="h-4 w-4 mr-1" /> Share my card</Button>
      </div>
      <p className="text-xs text-center text-muted-foreground">Your photo is private. It only leaves the app if you share your card.</p>
    </div>
  );
}
