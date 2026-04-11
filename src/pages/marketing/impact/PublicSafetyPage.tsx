import { useEffect } from "react";
import ImpactPage from "../ImpactPage";

export default function PublicSafetyPage() {
  useEffect(() => {
    document.title = "Public Safety — UWAZI.AI Impact";
  }, []);

  return (
    <ImpactPage
      eyebrow="IMPACT · PUBLIC SAFETY"
      title="Public Safety & Community Accountability"
      intro="UWAZI brings evidence-based, community-centered approaches to public safety. We help communities understand safety policy, track legislation, and engage constructively with the systems designed to serve them."
      focusAreas={[
        { title: "Safety Policy Literacy", desc: "Translating public safety legislation and policy into language that communities can engage with." },
        { title: "Community Data Tools", desc: "Helping organizations understand safety data at the neighborhood level — without bias or sensationalism." },
        { title: "Trust-Building Strategies", desc: "Consulting services for institutions seeking to rebuild trust with the communities they serve." },
      ]}
      ctaText="Work with us on public safety"
      ctaLink="/contact"
    />
  );
}
