import { useEffect } from "react";
import ImpactPage from "../ImpactPage";

export default function PublicHealthPage() {
  useEffect(() => {
    document.title = "Public Health — UWAZI.AI Impact";
  }, []);

  return (
    <ImpactPage
      eyebrow="IMPACT · PUBLIC HEALTH"
      title="Public Health & Civic Equity"
      intro="Health outcomes and civic participation are deeply connected. UWAZI research shows that communities with higher civic engagement have measurably better public health outcomes — and we're building the tools to prove and close that gap."
      focusAreas={[
        { title: "Health Policy Literacy", desc: "Making health policy and legislation understandable for community members and advocates." },
        { title: "Community Health Research", desc: "Raia Institute research on health equity, social determinants, and community wellness." },
        { title: "Civic-Health Correlation Data", desc: "The Raia Score correlates civic participation with housing stability, food access, and preventive care outcomes." },
      ]}
      stats={[
        { value: "1 in 3", label: "Americans lack civic health literacy" },
        { value: "Zip-code", label: "level health data" },
        { value: "RAG 1.0", label: "Powered by RAG 1.0" },
      ]}
      ctaText="Explore health research"
      ctaLink="/raia-institute"
    />
  );
}
