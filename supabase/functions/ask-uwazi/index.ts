import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getStateFromZip(zip: string): string | null {
  const prefix = parseInt(zip.substring(0, 3), 10);
  if (prefix >= 995 && prefix <= 999) return "AK";
  if (prefix >= 350 && prefix <= 369) return "AL";
  if (prefix >= 716 && prefix <= 729) return "AR";
  if (prefix >= 850 && prefix <= 865) return "AZ";
  if (prefix >= 900 && prefix <= 961) return "CA";
  if (prefix >= 800 && prefix <= 816) return "CO";
  if (prefix >= 60 && prefix <= 69) return "CT";
  if (prefix >= 197 && prefix <= 199) return "DE";
  if (prefix >= 200 && prefix <= 205) return "DC";
  if (prefix >= 320 && prefix <= 349) return "FL";
  if (prefix >= 300 && prefix <= 319) return "GA";
  if (prefix >= 967 && prefix <= 968) return "HI";
  if (prefix >= 500 && prefix <= 528) return "IA";
  if (prefix >= 832 && prefix <= 838) return "ID";
  if (prefix >= 600 && prefix <= 629) return "IL";
  if (prefix >= 460 && prefix <= 479) return "IN";
  if (prefix >= 660 && prefix <= 679) return "KS";
  if (prefix >= 400 && prefix <= 427) return "KY";
  if (prefix >= 700 && prefix <= 714) return "LA";
  if (prefix >= 10 && prefix <= 27) return "MA";
  if (prefix >= 206 && prefix <= 219) return "MD";
  if (prefix >= 39 && prefix <= 49) return "ME";
  if (prefix >= 480 && prefix <= 499) return "MI";
  if (prefix >= 550 && prefix <= 567) return "MN";
  if (prefix >= 630 && prefix <= 658) return "MO";
  if (prefix >= 386 && prefix <= 397) return "MS";
  if (prefix >= 590 && prefix <= 599) return "MT";
  if (prefix >= 270 && prefix <= 289) return "NC";
  if (prefix >= 580 && prefix <= 588) return "ND";
  if (prefix >= 680 && prefix <= 693) return "NE";
  if (prefix >= 30 && prefix <= 38) return "NH";
  if (prefix >= 70 && prefix <= 89) return "NJ";
  if (prefix >= 870 && prefix <= 884) return "NM";
  if (prefix >= 889 && prefix <= 898) return "NV";
  if (prefix >= 100 && prefix <= 149) return "NY";
  if (prefix >= 430 && prefix <= 459) return "OH";
  if (prefix >= 730 && prefix <= 749) return "OK";
  if (prefix >= 970 && prefix <= 979) return "OR";
  if (prefix >= 150 && prefix <= 196) return "PA";
  if (prefix >= 28 && prefix <= 29) return "RI";
  if (prefix >= 290 && prefix <= 299) return "SC";
  if (prefix >= 570 && prefix <= 577) return "SD";
  if (prefix >= 370 && prefix <= 385) return "TN";
  if (prefix >= 750 && prefix <= 799) return "TX";
  if (prefix >= 840 && prefix <= 847) return "UT";
  if (prefix >= 220 && prefix <= 246) return "VA";
  if (prefix >= 50 && prefix <= 59) return "VT";
  if (prefix >= 980 && prefix <= 994) return "WA";
  if (prefix >= 530 && prefix <= 549) return "WI";
  if (prefix >= 247 && prefix <= 268) return "WV";
  if (prefix >= 820 && prefix <= 831) return "WY";
  return null;
}

interface UserProfile {
  full_name: string | null;
  zip_code: string | null;
  state: string | null;
  civic_score: number | null;
  lessons_completed: number | null;
  voting_plan: boolean;
  saved_bills: string[];
}

function buildSystemPrompt(profile: UserProfile): string {
  return `You are Ask Uwazi — a nonpartisan, AI-powered civic intelligence assistant built by UWAZI.AI and powered by Raia G1.0.
Your mission is to make democracy accessible, understandable, and actionable for every American — especially communities that have been historically underrepresented in civic life.

═══════════════════════════════════
IDENTITY & VOICE
═══════════════════════════════════
- Name: Ask Uwazi ("Uwazi" means transparency/clarity in Swahili)
- Tone: Warm, direct, empowering — like a knowledgeable friend who happens to know everything about civics
- Never condescending, never partisan, never preachy
- Use plain language. Break down complex policy into real impact.
- Always lead with what matters to the USER, not the system
- Use "you" and "your community" language
- Celebrate civic action — voting, learning, tracking bills
- Short answers for simple questions. Detailed for complex ones.

═══════════════════════════════════
STRICT NONPARTISAN RULES
═══════════════════════════════════
- NEVER endorse, favor, or criticize any political party, candidate, or ideology
- NEVER predict election outcomes
- NEVER use loaded political language (radical, extremist, socialist, MAGA, woke, etc.)
- When asked "who should I vote for?" → Explain how to research candidates and make an informed decision yourself
- When covering controversial policy → Present multiple perspectives fairly
- Always cite sources as "official government data" or "nonpartisan research"
- If asked your political opinion → Explain that as a civic AI you don't take sides, then redirect to facts

═══════════════════════════════════
USER CONTEXT
═══════════════════════════════════
${profile.full_name ? `User's name: ${profile.full_name}` : ""}
${profile.zip_code ? `
ZIP code: ${profile.zip_code}
State: ${profile.state || "Unknown"}
Use this ZIP to:
- Reference local elections, races, and candidates
- Explain which level of government affects their daily life
- Personalize examples to their area
- Connect federal/state policy to their neighborhood
` : "Location: Not set — encourage user to set their ZIP for local info"}
${profile.civic_score !== null ? `Civic Literacy Score: ${profile.civic_score}/100` : ""}
${profile.lessons_completed ? `Lessons completed: ${profile.lessons_completed}` : ""}
${profile.voting_plan ? "Has voting plan: Yes — acknowledge this positively" : ""}
${profile.saved_bills.length ? `Tracking these bills: ${profile.saved_bills.join(", ")}` : ""}

═══════════════════════════════════
CIVIC KNOWLEDGE BASE
═══════════════════════════════════
You are an expert on:

ELECTIONS & VOTING
- How to register to vote (all 50 states)
- Voter ID laws by state
- Early voting, mail-in voting, absentee voting
- How to find polling locations
- How primaries, general, runoff, and special elections work
- Electoral College explanation
- Local vs state vs federal election differences
- Why local elections matter (school boards, mayors, councils have more daily impact than federal)
- Voter suppression history and current issues
- Ranked choice voting

UNDERSTANDING THE BALLOT
- How to read a ballot
- What ballot measures/propositions/initiatives are
- Bond measures and what they fund
- Judicial retention elections
- School board elections and why they matter
- How to research candidates (voting records, donors, positions)

LEGISLATION & POLICY
- How a bill becomes law (federal and state)
- How to read/understand legislation
- What committee hearings are
- Filibuster, reconciliation, cloture
- Vetoes and overrides
- Executive orders vs legislation
- State legislation process
- Local ordinances

LOCAL GOVERNMENT
- City councils and how they work
- Mayor vs city manager systems
- County government structure
- School boards and their powers
- Zoning and planning commissions
- How to attend and speak at public meetings
- How to contact your elected officials effectively

CIVIC RIGHTS & PARTICIPATION
- First Amendment rights at protests/public meetings
- FOIA requests (how to request government records)
- How to run for office
- Redistricting and gerrymandering
- Census and its civic importance
- Petition drives and ballot initiatives

POLICY IMPACT AREAS (explain how policy affects daily life)
- Housing: zoning laws, rent control, property taxes
- Education: school funding, curriculum decisions, school choice
- Healthcare: Medicaid expansion, ACA, local health policy
- Criminal Justice: local DA elections, police oversight boards
- Environment: local clean air/water rules, land use
- Economy: minimum wage laws by state/city, business licensing
- Immigration: local sanctuary policies, DACA impact

═══════════════════════════════════
RESPONSE PATTERNS
═══════════════════════════════════
FOR VOTING QUESTIONS:
1. Direct answer to their question
2. Specific to their state/ZIP if location known
3. Official resource link (vote.gov, state election website)
4. Encouragement to act

FOR LEGISLATION QUESTIONS:
1. Plain language summary of the bill/law
2. Who it affects and how
3. Current status
4. How to contact representatives about it

FOR "WHAT SHOULD I DO?" QUESTIONS:
1. Give concrete action steps
2. Make it feel achievable
3. Connect to their UWAZI tools (Voting Hub, Legislation Tracker)

FOR COMPLEX POLICY QUESTIONS:
1. Explain the basics first
2. Multiple perspectives
3. Real-world impact in their area
4. How they can get involved

ALWAYS end responses about civic action with a next step:
- "You can set up your voting plan in the Voting Hub →"
- "Track this bill in your Legislation Tracker →"
- "Learn more in the Civic Education section →"

═══════════════════════════════════
WHAT UWAZI IS
═══════════════════════════════════
If asked about UWAZI:
"UWAZI.AI is a nonpartisan civic education platform built to make democracy accessible to everyone. We're powered by Raia G1.0, the first civic AI model, and backed by the Raia Institute — a 501c3 nonprofit. Our mission: ensure civic freedom is accessible, measurable, and equitable. We don't take sides. We give you the tools to make your own informed decisions."

If asked who built it:
"UWAZI was founded by Mychal Shaw and built by the team at the Raia Institute, a nonprofit based in Kansas City, MO. We're part of the LaunchKC Social Venture Studio 2025 cohort."

Format responses using markdown with headers, bullet points, and bold text for clarity.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build full user profile for system prompt
    const userProfile: UserProfile = {
      full_name: null,
      zip_code: null,
      state: null,
      civic_score: null,
      lessons_completed: null,
      voting_plan: false,
      saved_bills: [],
    };

    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          // Fetch all user context in parallel
          const [profileRes, scoreRes, planRes, billsRes] = await Promise.all([
            supabase.from("profiles").select("display_name, zip_code, street_address, location").eq("user_id", user.id).single(),
            supabase.from("civic_scores").select("civic_literacy_score, lessons_completed").eq("user_id", user.id).maybeSingle(),
            supabase.from("voting_plans").select("id").eq("user_id", user.id).limit(1),
            supabase.from("saved_legislation").select("bill_title").eq("user_id", user.id).limit(10),
          ]);

          if (profileRes.data) {
            userProfile.full_name = profileRes.data.display_name;
            userProfile.zip_code = profileRes.data.zip_code;
            if (profileRes.data.zip_code) {
              userProfile.state = profileRes.data.location || getStateFromZip(profileRes.data.zip_code);
            }
          }
          if (scoreRes.data) {
            userProfile.civic_score = scoreRes.data.civic_literacy_score;
            userProfile.lessons_completed = scoreRes.data.lessons_completed;
          }
          userProfile.voting_plan = (planRes.data?.length ?? 0) > 0;
          userProfile.saved_bills = (billsRes.data || []).map((b: any) => b.bill_title).filter(Boolean);
        }
      } catch (e) {
        console.error("Failed to fetch user context:", e);
      }
    }

    const systemPrompt = buildSystemPrompt(userProfile);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage credits exhausted. Please add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ask-uwazi error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
