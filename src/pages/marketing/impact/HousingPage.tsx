import { useEffect } from "react";
import ImpactPage from "../ImpactPage";

export default function HousingPage() {
  useEffect(() => {
    document.title = "Housing — UWAZI.AI Impact";
  }, []);

  return (
    <ImpactPage
      eyebrow="IMPACT · HOUSING"
      title="Housing Affordability & Policy"
      intro="Housing policy is one of the most complex and consequential areas of civic life. UWAZI makes housing legislation understandable, tracks displacement patterns, and helps communities engage with the policies that shape where they live."
      focusAreas={[
        { title: "Housing Policy Tracking", desc: "Real-time monitoring of local, state, and federal housing legislation in plain language." },
        { title: "Displacement Research", desc: "Raia Institute research on housing data, displacement trends, and policy interventions." },
        { title: "Tenant Rights Education", desc: "Clear, accessible information about tenant rights and housing assistance programs." },
      ]}
      ctaText="Work with us on housing"
      ctaLink="/contact"
    />
  );
}
