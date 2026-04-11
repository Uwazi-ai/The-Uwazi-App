import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const examples = [
  "What's on my ballot?",
  "Who represents me in Congress?",
  "Explain this bill in plain English",
  "When is the next election in my area?",
  "What is ranked choice voting?",
  "How do I register to vote in Missouri?",
];

const steps = [
  { num: "01", title: "You ask", desc: "Type any civic question in plain language" },
  { num: "02", title: "Uwazi researches", desc: "RAG 1.0 searches verified civic data sources" },
  { num: "03", title: "You get clarity", desc: "Clear, sourced, nonpartisan answer in seconds" },
];

const differentiators = [
  { title: "Civic-only focus", desc: "Trained specifically on civic, legislative, and electoral data" },
  { title: "Nonpartisan by design", desc: "No political bias. Facts only." },
  { title: "Source-cited", desc: "Every answer references its sources" },
  { title: "Location-aware", desc: "Answers personalized to your ZIP code and state" },
];

export default function AskUwaziProductPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>
        {/* HERO */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">ASK UWAZI</p>
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6">Your Political Co-Pilot</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Ask any civic question and get clear, nonpartisan, AI-powered answers grounded in real data. No jargon. No spin. Just clarity.
            </p>
            <a href="https://uwaziapp.uwazi.ai" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors">
              Try Ask Uwazi →
            </a>
          </div>
        </section>

        {/* EXAMPLE QUESTIONS */}
        <section className="py-20 px-6 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-10 text-center">What can you ask?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {examples.map((e) => (
                <div key={e} className="bg-card border border-border rounded-xl px-5 py-4 text-sm text-muted-foreground hover:border-primary/30 transition-colors">"{e}"</div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-12 text-center">How Ask Uwazi works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((s) => (
                <div key={s.num} className="text-center">
                  <p className="font-heading text-4xl text-primary mb-3">{s.num}</p>
                  <h3 className="font-medium text-lg mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT MAKES IT DIFFERENT */}
        <section className="py-20 px-6 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-12 text-center">Built differently than other AI</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {differentiators.map((d) => (
                <div key={d.title} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
                  <h3 className="font-medium mb-2">{d.title}</h3>
                  <p className="text-sm text-muted-foreground">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-4xl tracking-tight mb-6">Ask your first civic question</h2>
            <a href="https://uwaziapp.uwazi.ai" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors">
              Open Ask Uwazi →
            </a>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
