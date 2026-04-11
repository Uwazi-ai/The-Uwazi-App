import { useState } from "react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", organization: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll be in touch soon.");
    setForm({ name: "", email: "", organization: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <MarketingNav />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Get in touch</h1>
          <p className="text-white/60 text-lg mb-12">
            Whether you want to book a demo, start a consulting engagement, or just learn more — we'd love to hear from you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-white/70 mb-2 block">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-white/[0.05] border-white/10 text-white" />
            </div>
            <div>
              <Label htmlFor="email" className="text-white/70 mb-2 block">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="bg-white/[0.05] border-white/10 text-white" />
            </div>
            <div>
              <Label htmlFor="organization" className="text-white/70 mb-2 block">Organization</Label>
              <Input id="organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="bg-white/[0.05] border-white/10 text-white" />
            </div>
            <div>
              <Label htmlFor="message" className="text-white/70 mb-2 block">Message</Label>
              <Textarea id="message" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required className="bg-white/[0.05] border-white/10 text-white" />
            </div>
            <button type="submit" className="px-8 py-3 bg-[#9bd34b] text-black font-semibold rounded-full hover:bg-[#9bd34b]/90 transition-colors">
              Send Message
            </button>
          </form>

          <p className="mt-10 text-white/50 text-sm">
            Or email us directly at{" "}
            <a href="mailto:myke@uwazi.ai" className="text-[#9bd34b] hover:underline">myke@uwazi.ai</a>
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
