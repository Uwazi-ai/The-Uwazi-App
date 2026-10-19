import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoRequest, type DemoPersona } from "@/lib/compassDemo";

export default function CompassPersonaPage() {
  const { personaKey = "" } = useParams();
  const [persona, setPersona] = useState<DemoPersona | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    demoRequest<DemoPersona[]>(`compass_personas?select=slug,name,one_line,archetype_intro,archetype_examples&slug=eq.${encodeURIComponent(personaKey)}`).then(rows => { if (active) setPersona(rows[0] ?? null); }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [personaKey]);
  return <main className="min-h-dvh overflow-x-hidden bg-background p-6 text-foreground"><div className="mx-auto max-w-xl space-y-6 py-10"><Compass className="size-10 text-primary" />{loading ? <p role="status">Loading persona.</p> : persona ? <><h1 className="font-heading text-4xl">{persona.name}</h1><p>{persona.archetype_intro}</p><p className="text-muted-foreground">{persona.archetype_examples}</p><p>{persona.one_line}</p></> : <h1 className="font-heading text-2xl">Persona not found.</h1>}<Button asChild className="h-12"><Link to="/app/compass">Take the Civic Compass</Link></Button></div></main>;
}