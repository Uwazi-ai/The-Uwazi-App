import ImpactPage from "../ImpactPage";

export default function WorkforcePage() {
  return (
    <ImpactPage
      eyebrow="IMPACT · WORKFORCE"
      title="Workforce Development & Economic Opportunity"
      intro="Economic opportunity and civic participation are inseparable. UWAZI tracks workforce development policy, helps communities understand legislation that affects jobs and economic mobility, and connects civic intelligence to real economic outcomes."
      focusAreas={[
        { title: "Workforce Policy Tracking", desc: "Following legislation on job training, minimum wage, benefits, and economic development in plain language." },
        { title: "Economic Mobility Research", desc: "Raia Institute research on the civic factors that drive or limit economic mobility." },
        { title: "Community Economic Tools", desc: "Helping nonprofits and governments design workforce programs grounded in community data." },
      ]}
      ctaText="Work with us on workforce"
      ctaLink="/contact"
    />
  );
}
