import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} />
        Back
      </Link>

      <h1 className="text-3xl font-bold mb-2">Terms of Service — UWAZI.AI</h1>
      <p className="text-muted-foreground text-sm mb-8">Effective: April 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Nonpartisan & Educational</h2>
          <p>UWAZI.AI is a nonpartisan civic education platform. Our mission is to help users understand their government, elections, and legislation — without political bias or advocacy.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Age Requirement</h2>
          <p>Users must be 13 years of age or older to use this service, in compliance with the Children's Online Privacy Protection Act (COPPA). By creating an account, you confirm that you meet this age requirement.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">No Political Advocacy or Endorsement</h2>
          <p>UWAZI.AI does not endorse, advocate for, or oppose any political party, candidate, or ballot measure. Information provided is for educational purposes only.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">User Conduct</h2>
          <p>You agree to use the platform responsibly and not to misuse, disrupt, or attempt to gain unauthorized access to any part of the service.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Contact</h2>
          <p>For legal inquiries, email us at <a href="mailto:legal@uwazi.ai" className="text-primary hover:underline">legal@uwazi.ai</a></p>
        </div>
      </section>
    </div>
  );
}
