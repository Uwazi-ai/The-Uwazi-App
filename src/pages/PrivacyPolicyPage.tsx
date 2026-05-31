import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-3xl mx-auto">
      <Helmet>
        <title>Privacy Policy — UWAZI</title>
        <meta name="description" content="How UWAZI collects, uses, and protects user data across the civic intelligence platform." />
        <link rel="canonical" href="https://uwaziapp.uwazi.ai/privacy" />
        <meta property="og:title" content="Privacy Policy — UWAZI" />
        <meta property="og:description" content="How UWAZI collects, uses, and protects user data." />
        <meta property="og:url" content="https://uwaziapp.uwazi.ai/privacy" />
      </Helmet>
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} />
        Back
      </Link>

      <h1 className="text-3xl font-bold mb-2">Privacy Policy — UWAZI.AI</h1>
      <p className="text-muted-foreground text-sm mb-8">Effective: April 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">What We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Email address for account creation</li>
            <li>ZIP code for local civic data</li>
            <li>Usage data (pages visited, features used)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">What We Don't Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>We do not sell your data</li>
            <li>We do not track political affiliation or party preference</li>
            <li>We do not share data with advertisers</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">How We Use Your Data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To personalize your civic dashboard</li>
            <li>To show you relevant local elections and legislation</li>
            <li>To improve the product</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Data Security</h2>
          <p>All data is encrypted in transit and at rest. Our infrastructure is powered by industry-standard cloud security practices.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Contact</h2>
          <p>For privacy inquiries, email us at <a href="mailto:privacy@uwazi.ai" className="text-primary hover:underline">privacy@uwazi.ai</a></p>
        </div>
      </section>
    </div>
  );
}
