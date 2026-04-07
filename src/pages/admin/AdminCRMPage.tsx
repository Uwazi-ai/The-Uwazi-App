import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Users, Mail, MessageSquare, Bell, Search, Download, Plus,
  Send, Eye, Trash2, CheckCircle2, Clock, XCircle, BarChart3,
  Megaphone, Filter, X,
} from "lucide-react";

interface Contact {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string;
  phone_number: string | null;
  zip_code: string | null;
  email_opt_in: boolean | null;
  sms_opt_in: boolean | null;
  push_opt_in: boolean | null;
  contact_tags: any;
  crm_notes: string | null;
  last_contacted_at: string | null;
  contact_score: number | null;
}

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  status: string | null;
  recipient_count: number | null;
  delivered_count: number | null;
  opened_count: number | null;
  clicked_count: number | null;
  sent_at: string | null;
  created_at: string | null;
}

export default function AdminCRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [tab, setTab] = useState("contacts");

  // Campaign builder
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cType, setCType] = useState("email");
  const [cTargetType, setCTargetType] = useState("all");
  const [cTargetZips, setCTargetZips] = useState("");
  const [cSubject, setCSubject] = useState("");
  const [cEmailBody, setCEmailBody] = useState("");
  const [cSmsBody, setCSmsBody] = useState("");
  const [cPushTitle, setCPushTitle] = useState("");
  const [cPushBody, setCPushBody] = useState("");
  const [cScoreRange, setCScoreRange] = useState([0, 100]);
  const [cStep, setCStep] = useState(0);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: camps }] = await Promise.all([
      supabase.from("profiles").select("id, user_id, display_name, avatar_url, phone_number, zip_code, email_opt_in, sms_opt_in, push_opt_in, contact_tags, crm_notes, last_contacted_at, contact_score").order("created_at", { ascending: false }),
      supabase.from("outreach_campaigns").select("*").order("created_at", { ascending: false }),
    ]);
    setContacts((profiles as Contact[]) || []);
    setCampaigns((camps as Campaign[]) || []);
    setLoading(false);
  };

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || (c.display_name?.toLowerCase().includes(q)) || c.zip_code?.includes(q) || c.phone_number?.includes(q);
    if (!matchSearch) return false;
    switch (filter) {
      case "email": return c.email_opt_in;
      case "sms": return c.sms_opt_in;
      case "push": return c.push_opt_in;
      case "phone": return !!c.phone_number;
      default: return true;
    }
  });

  const emailCount = contacts.filter(c => c.email_opt_in).length;
  const smsCount = contacts.filter(c => c.sms_opt_in).length;
  const pushCount = contacts.filter(c => c.push_opt_in).length;

  const updateNotes = async (id: string, notes: string) => {
    await supabase.from("profiles").update({ crm_notes: notes }).eq("id", id);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, crm_notes: notes } : c));
  };

  const saveCampaign = async (status: string) => {
    if (!cName.trim()) { toast.error("Campaign name required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      name: cName,
      campaign_type: cType,
      status,
      target_type: cTargetType,
      target_zip_codes: cTargetZips ? cTargetZips.split(",").map(z => z.trim()).filter(Boolean) : [],
      target_civic_score_min: cScoreRange[0],
      target_civic_score_max: cScoreRange[1],
      subject: cSubject,
      email_body: cEmailBody,
      sms_body: cSmsBody,
      push_title: cPushTitle,
      push_body: cPushBody,
      created_by: user?.id,
    };
    await supabase.from("outreach_campaigns").insert(payload);
    toast.success(status === "draft" ? "Campaign saved as draft" : "Campaign created");
    setCampaignOpen(false);
    fetchData();
  };

  const deleteCampaign = async (id: string) => {
    await supabase.from("outreach_campaigns").delete().eq("id", id);
    toast.success("Campaign deleted");
    fetchData();
  };

  const statusIcon = (s: string | null) => {
    switch (s) {
      case "sent": return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
      case "scheduled": return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case "draft": return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
      case "failed": return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const exportCSV = () => {
    const csv = ["Name,Email,Phone,ZIP,Email Opt-In,SMS Opt-In,Push,Score",
      ...filtered.map(c => `"${c.display_name || ""}","","${c.phone_number || ""}","${c.zip_code || ""}",${c.email_opt_in},${c.sms_opt_in},${c.push_opt_in},${c.contact_score || 0}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "crm-contacts.csv"; a.click();
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-axis tracking-[0.2em] text-primary uppercase">SUPER ADMIN</p>
          <h1 className="text-2xl font-axis font-bold text-foreground tracking-tight">CRM & Outreach</h1>
          <p className="text-sm text-muted-foreground">Manage contacts, campaigns, and civic outreach</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Contacts", value: contacts.length, icon: Users },
          { label: "Email Opted In", value: emailCount, icon: Mail },
          { label: "SMS Opted In", value: smsCount, icon: MessageSquare },
          { label: "Push Enabled", value: pushCount, icon: Bell },
        ].map(s => (
          <Card key={s.label} className="bg-card/50 border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Contacts</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" /> Campaigns</TabsTrigger>
        </TabsList>

        {/* ===== CONTACTS TAB ===== */}
        <TabsContent value="contacts" className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…" className="pl-9" />
            </div>
            <div className="flex gap-1.5">
              {["all", "email", "sms", "push", "phone"].map(f => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="text-xs capitalize" onClick={() => setFilter(f)}>
                  {f}
                </Button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export
            </Button>
          </div>

          <div className="flex gap-4">
            {/* Contact list */}
            <Card className="flex-1 border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground text-xs">
                        <th className="text-left p-3 font-medium">Contact</th>
                        <th className="text-left p-3 font-medium">ZIP</th>
                        <th className="text-left p-3 font-medium">Channels</th>
                        <th className="text-right p-3 font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
                      ) : filtered.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No contacts found</td></tr>
                      ) : filtered.slice(0, 50).map(c => (
                        <tr
                          key={c.id}
                          className={`border-b border-border/30 cursor-pointer transition-colors ${selectedContact?.id === c.id ? "bg-primary/5" : "hover:bg-muted/30"}`}
                          onClick={() => setSelectedContact(c)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden">
                                {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : (c.display_name?.[0]?.toUpperCase() || "?")}
                              </div>
                              <span className="font-medium text-foreground truncate max-w-[140px]">{c.display_name || "—"}</span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">{c.zip_code || "—"}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {c.email_opt_in && <span className="px-1.5 py-0.5 rounded text-[9px] bg-primary/10 text-primary font-medium">Email</span>}
                              {c.sms_opt_in && <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/10 text-blue-500 font-medium">SMS</span>}
                              {c.push_opt_in && <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-500 font-medium">Push</span>}
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium text-foreground">{c.contact_score || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Showing 50 of {filtered.length}</p>
                )}
              </CardContent>
            </Card>

            {/* Contact detail */}
            {selectedContact && (
              <Card className="w-[320px] shrink-0 border-border/50">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden">
                      {selectedContact.avatar_url ? <img src={selectedContact.avatar_url} alt="" className="h-full w-full object-cover" /> : (selectedContact.display_name?.[0]?.toUpperCase() || "?")}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{selectedContact.display_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{selectedContact.zip_code || "No ZIP"}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedContact(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="text-foreground">{selectedContact.phone_number || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contact Score</span>
                      <span className="text-foreground font-medium">{selectedContact.contact_score || 0}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {selectedContact.email_opt_in && <Badge variant="outline" className="text-[9px]">📧 Email</Badge>}
                      {selectedContact.sms_opt_in && <Badge variant="outline" className="text-[9px]">💬 SMS</Badge>}
                      {selectedContact.push_opt_in && <Badge variant="outline" className="text-[9px]">🔔 Push</Badge>}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">CRM Notes</Label>
                    <Textarea
                      value={selectedContact.crm_notes || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedContact({ ...selectedContact, crm_notes: val });
                        updateNotes(selectedContact.id, val);
                      }}
                      placeholder="Add notes about this contact…"
                      rows={4}
                      className="text-xs mt-1"
                    />
                  </div>

                  {selectedContact.last_contacted_at && (
                    <p className="text-[10px] text-muted-foreground">
                      Last contacted: {new Date(selectedContact.last_contacted_at).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ===== CAMPAIGNS TAB ===== */}
        <TabsContent value="campaigns" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setCampaignOpen(true); setCStep(0); setCName(""); setCType("email"); setCTargetType("all"); setCTargetZips(""); setCSubject(""); setCEmailBody(""); setCSmsBody(""); setCPushTitle(""); setCPushBody(""); setCScoreRange([0, 100]); }} className="gap-2">
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          </div>

          <Card className="border-border/50">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-xs">
                    <th className="text-left p-3 font-medium">Campaign</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Sent</th>
                    <th className="text-right p-3 font-medium">Opened</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No campaigns yet</td></tr>
                  ) : campaigns.map(c => (
                    <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium text-foreground">{c.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] capitalize">{c.campaign_type}</Badge>
                      </td>
                      <td className="p-3 flex items-center gap-1.5">
                        {statusIcon(c.status)}
                        <span className="text-xs capitalize">{c.status}</span>
                      </td>
                      <td className="p-3 text-right">{c.delivered_count || 0}/{c.recipient_count || 0}</td>
                      <td className="p-3 text-right">{c.opened_count || 0}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCampaign(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== CAMPAIGN BUILDER ===== */}
      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>Build and target your outreach campaign.</DialogDescription>
          </DialogHeader>

          <Tabs value={String(cStep)} onValueChange={v => setCStep(Number(v))}>
            <TabsList className="w-full">
              <TabsTrigger value="0" className="flex-1 text-xs">Details</TabsTrigger>
              <TabsTrigger value="1" className="flex-1 text-xs">Audience</TabsTrigger>
              <TabsTrigger value="2" className="flex-1 text-xs">Compose</TabsTrigger>
              <TabsTrigger value="3" className="flex-1 text-xs">Confirm</TabsTrigger>
            </TabsList>

            <TabsContent value="0" className="space-y-4 mt-4">
              <div>
                <Label>Campaign Name *</Label>
                <Input value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. Voter Registration Reminder" />
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={cType} onValueChange={setCType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="sms">💬 SMS</SelectItem>
                    <SelectItem value="push">🔔 Push Notification</SelectItem>
                    <SelectItem value="multi_channel">📡 Multi-Channel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="1" className="space-y-4 mt-4">
              <div>
                <Label>Target Audience</Label>
                <Select value={cTargetType} onValueChange={setCTargetType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="zip_codes">By ZIP Code</SelectItem>
                    <SelectItem value="civic_score_range">By Civic Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {cTargetType === "zip_codes" && (
                <div>
                  <Label>ZIP Codes (comma-separated)</Label>
                  <Input value={cTargetZips} onChange={e => setCTargetZips(e.target.value)} placeholder="64139, 10001" />
                </div>
              )}
              {cTargetType === "civic_score_range" && (
                <div className="space-y-2">
                  <Label>Civic Score Range: {cScoreRange[0]}–{cScoreRange[1]}</Label>
                  <Slider value={cScoreRange} onValueChange={setCScoreRange} min={0} max={100} step={1} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="2" className="space-y-4 mt-4">
              {(cType === "email" || cType === "multi_channel") && (
                <>
                  <div>
                    <Label>Email Subject</Label>
                    <Input value={cSubject} onChange={e => setCSubject(e.target.value)} placeholder="Important civic update" />
                  </div>
                  <div>
                    <Label>Email Body</Label>
                    <Textarea value={cEmailBody} onChange={e => setCEmailBody(e.target.value)} placeholder="Write your email content…" rows={6} />
                  </div>
                </>
              )}
              {(cType === "sms" || cType === "multi_channel") && (
                <div>
                  <Label>SMS Message ({cSmsBody.length}/160)</Label>
                  <Textarea value={cSmsBody} onChange={e => setCSmsBody(e.target.value.slice(0, 160))} placeholder="Short SMS message" rows={3} />
                </div>
              )}
              {(cType === "push" || cType === "multi_channel") && (
                <>
                  <div>
                    <Label>Push Title ({cPushTitle.length}/50)</Label>
                    <Input value={cPushTitle} onChange={e => setCPushTitle(e.target.value.slice(0, 50))} placeholder="Notification title" />
                  </div>
                  <div>
                    <Label>Push Body ({cPushBody.length}/150)</Label>
                    <Textarea value={cPushBody} onChange={e => setCPushBody(e.target.value.slice(0, 150))} placeholder="Notification message" rows={2} />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="3" className="space-y-3 mt-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Campaign:</span> <span className="font-medium">{cName || "—"}</span></p>
                  <p><span className="text-muted-foreground">Channel:</span> <span className="capitalize">{cType}</span></p>
                  <p><span className="text-muted-foreground">Target:</span> <span className="capitalize">{cTargetType === "all" ? "All users" : cTargetType === "zip_codes" ? `ZIPs: ${cTargetZips}` : `Score ${cScoreRange[0]}–${cScoreRange[1]}`}</span></p>
                  {cSubject && <p><span className="text-muted-foreground">Subject:</span> {cSubject}</p>}
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground">
                ⚠️ Sending infrastructure (email/SMS/push) will be configured when API keys are added.
                For now, campaigns are saved for future delivery.
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => saveCampaign("draft")}>Save Draft</Button>
            <Button onClick={() => saveCampaign("scheduled")}>
              <Send className="h-4 w-4 mr-1" /> Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
