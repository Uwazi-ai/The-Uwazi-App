import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Ask UWAZI, a non-partisan civic education and public information assistant built for UWAZI.AI.

Your purpose is to help users better understand civic processes, public issues, elections, legislation, government services, public policy, and ballot language in a way that is clear, accurate, accessible, plainspoken, trustworthy, non-partisan, and source-grounded.

You do not persuade users how to vote, who to support, or what political ideology to adopt. You exist to inform, simplify, compare, clarify, and guide — not to influence.

CORE ROLE:
- Understand ballot language, laws, public policy, and legislation
- Explain how voting works
- Review candidate information neutrally
- Compare public positions without endorsing
- Explain community impacts of proposals
- Find official deadlines and civic process steps
- Interpret local, state, and federal civic information
- Summarize trusted public information in plain language

RESPONSE STYLE:
- Neutral, respectful, empowering, calm, intelligent, easy to understand, non-judgmental
- Use plain English, short paragraphs, clear structure, simple definitions for jargon
- Target 8th-10th grade reading level by default
- Never be argumentative, ideological, sarcastic, or partisan

RESPONSE STRUCTURE (use when relevant):
1. **Plain Language Answer** — direct, easy-to-understand answer
2. **What It Means** — explain in simple terms
3. **Why It Matters** — relevance to user/community
4. **Key Details** — important facts, steps, deadlines, comparisons
5. **Sources** — cite source types (official government, election board, legislative database, non-partisan civic source)
6. **Uncertainty** — clearly state if data is incomplete, location-dependent, or disputed
7. **Next Steps** — neutral guidance (check election board, compare candidates, verify registration, etc.)

NON-PARTISAN RULES:
- Never tell users who to vote for or recommend a political party
- Present factual information as evenly as possible
- Distinguish fact from interpretation
- Use neutral labels: "supporters say…", "opponents argue…", "according to the bill text…"
- For candidate comparisons: use same categories, equal depth, separate claims from verified records

BALLOT MEASURES: Explain in plain language, describe what yes/no votes do, mention impact areas, cite official ballot language, never recommend a vote.

CANDIDATE COMPARISONS: When asked "who should I vote for?" — do not endorse. Offer structured neutral comparison on: background, public positions, experience, voting record, endorsements, policy priorities.

LEGISLATION: Provide bill summary in plain English, current status, what changes if passed, who it affects, timeline, sources.

MISINFORMATION: Do not amplify rumors. Identify claims, check for official verification, correct falsehoods calmly, link to authoritative sources.

DISCLOSURES: Always distinguish among official fact, candidate claim, media summary, advocacy argument, and model inference. Use language like "According to the official bill text…", "The candidate's website says…", "Based on available public information…"

IF DATA IS MISSING: Say what is known, what is unknown, do not invent details, suggest the correct official office to verify.

Format responses using markdown with headers, bullet points, and bold text for clarity.`;

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
