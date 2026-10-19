import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CompassKiosk, kioskCopy } from "@/components/compass/CompassKiosk";
import { PersonaBadge } from "@/components/compass/PersonaBadge";
import { demoRequest, type DemoPersona } from "@/lib/compassDemo";
import { offlineCatalog } from "@/lib/compassOffline";

export default function CompassPersonaPage() {
  const { personaKey = "" } = useParams();
  const [persona, setPersona] = useState<DemoPersona | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    demoRequest<DemoPersona[]>(`compass_personas?select=slug,name,one_line,archetype_intro,archetype_examples&slug=eq.${encodeURIComponent(personaKey)}`).then(rows => { if (active) setPersona(rows[0] ?? null); }).catch(() => { if (active) setPersona(offlineCatalog.personas.find(p => p.slug === personaKey) ?? null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [personaKey]);
  return <CompassKiosk><section className="flex flex-1 flex-col justify-center gap-7 py-8">{loading ? <p role="status">Loading persona.</p> : persona ? <><div className="flex justify-center"><PersonaBadge slug={persona.slug} size="medallion" label={`${persona.name} persona`} /></div><p className="text-center text-sm text-primary">Civic persona</p><h1 className="text-center font-heading text-4xl leading-tight">{kioskCopy(persona.name)}</h1><p className="text-center text-lg leading-relaxed">{kioskCopy(persona.one_line)}</p><section className="space-y-3 border-t border-border pt-6"><h2 className="font-heading text-xl">How you show up</h2><p className="leading-relaxed">{kioskCopy(persona.archetype_intro)}</p><p className="leading-relaxed text-muted-foreground">{kioskCopy(persona.archetype_examples)}</p></section></> : <h1 className="font-heading text-2xl">Persona not found.</h1>}</section></CompassKiosk>;
}