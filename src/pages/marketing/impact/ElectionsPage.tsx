import ImpactPage from "../ImpactPage";

export default function ElectionsPage() {
  return (
    <ImpactPage
      eyebrow="IMPACT · ELECTIONS"
      title="Elections & Democratic Participation"
      intro="UWAZI approaches elections as both a data system and a trust system. We analyze voting data, turnout trends, polling insights, and civic sentiment — to understand not just who participates, but where participation breaks down and why."
      focusAreas={[
        { title: "Voter Education & Outreach", desc: "Designing outreach strategies that reach voters where they are — not where institutions expect them to be." },
        { title: "Ballot Comprehension", desc: "Translating ballot language into plain English so every voter understands what they're deciding." },
        { title: "Election Data & Analytics", desc: "Tracking turnout trends, civic sentiment, and participation gaps at the neighborhood level." },
      ]}
      stats={[
        { value: "15%", label: "Local election turnout" },
        { value: "80%", label: "Voters overwhelmed by ballots" },
        { value: "50M+", label: "Eligible voters who don't participate" },
      ]}
      ctaText="Work with us on elections"
      ctaLink="/contact"
    />
  );
}
