import { useState } from "react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const interests = [
  "UWAZI App",
  "Jamii Platform",
  "Consulting Services",
  "Raia Institute Partnership",
  "General Inquiry",
];

export default function ContactPage() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", organization: "", interest: "", message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setForm({ firstName: "", lastName: "", email: "", organization: "", interest: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <MarketingNav />
      <main>
        <section className="pt-32 pb-12 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Get in Touch</h1>
            <p className="text-white/60 text-lg">
              Whether you're interested in our products, consulting services, or partnership opportunities, we'd love to hear from you.
            </p>
          </div>
        </section>

        <section className="pb-24 px-6">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.4fr_1fr] gap-12">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 md:p-10">
              <h2 className="text-2xl font-bold mb-2">Send us a message</h2>
              <p className="text-white/50 text-sm mb-8">Fill out the form below and we'll get back to you within 24 hours.</p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="firstName" className="text-white/70 mb-2 block text-sm">First Name</Label>
                    <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required className="bg-white/[0.05] border-white/10 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-white/70 mb-2 block text-sm">Last Name</Label>
                    <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required className="bg-white/[0.05] border-white/10 text-white" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-white/70 mb-2 block text-sm">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="bg-white/[0.05] border-white/10 text-white" />
                </div>
                <div>
                  <Label htmlFor="organization" className="text-white/70 mb-2 block text-sm">Organization</Label>
                  <Input id="organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="bg-white/[0.05] border-white/10 text-white" />
                </div>
                <div>
                  <Label htmlFor="interest" className="text-white/70 mb-2 block text-sm">I'm interested in...</Label>
                  <select id="interest" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} className="w-full rounded-md bg-white/[0.05] border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9bd34b]/50">
                    <option value="" className="bg-[#141414]">Select an option</option>
                    {interests.map((i) => (<option key={i} value={i} className="bg-[#141414]">{i}</option>))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="message" className="text-white/70 mb-2 block text-sm">Message</Label>
                  <Textarea id="message" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required className="bg-white/[0.05] border-white/10 text-white" />
                </div>
                <button type="submit" className="w-full px-8 py-3 bg-[#9bd34b] text-black font-semibold rounded-full hover:bg-[#9bd34b]/90 transition-colors">
                  Send Message
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
                <h3 className="text-lg font-semibold mb-2">Email Us</h3>
                <p className="text-white/50 text-sm mb-3">For general inquiries and support</p>
                <a href="mailto:hello@uwazi.ai" className="text-[#9bd34b] hover:underline text-sm font-medium">hello@uwazi.ai</a>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
                <h3 className="text-lg font-semibold mb-2">Book a Meeting</h3>
                <p className="text-white/50 text-sm mb-3">Schedule a call with our team</p>
                <p className="text-white/50 text-sm mb-3">Prefer to speak directly? Book a time that works for you.</p>
                <a href="mailto:Myke@uwazi.ai" className="text-[#9bd34b] hover:underline text-sm font-medium">Myke@uwazi.ai</a>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
                <h3 className="text-lg font-semibold mb-2">Research Partnerships</h3>
                <p className="text-white/50 text-sm">
                  If you're interested in partnering with the Raia Institute on research or civic data projects, please mention it in your message above.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}