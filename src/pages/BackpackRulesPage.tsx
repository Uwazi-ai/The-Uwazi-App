import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";

export default function BackpackRulesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-3xl mx-auto">
      <Helmet>
        <title>Operation Backpack KC Offer Rules — UWAZI</title>
        <meta
          name="description"
          content="Official rules for the UWAZI+ free-year promo cards distributed at Operation Backpack KC on August 1, 2026."
        />
        <link rel="canonical" href="https://uwaziapp.uwazi.ai/backpack-rules" />
      </Helmet>

      <Link to="/redeem" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} />
        Back
      </Link>

      <h1 className="text-3xl font-bold mb-2">Operation Backpack KC — UWAZI+ Offer Rules</h1>
      <p className="text-muted-foreground text-sm mb-8">Event date: August 1, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-foreground">
          Final rules text is pending sign-off. The summary below reflects the terms printed on the card.
        </p>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">The offer</h2>
          <p>
            Each card carries one unique code good for twelve (12) months of UWAZI+ at no cost. The term
            begins when the code is redeemed, not on the event date.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Redemption</h2>
          <p>
            Codes must be redeemed by September 15, 2026. One code per person. A UWAZI account is required.
            Codes have no cash value and cannot be transferred or replaced if lost.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Questions</h2>
          <p>
            Email <a href="mailto:support@uwazi.ai" className="text-primary hover:underline">support@uwazi.ai</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
