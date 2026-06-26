import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getStateFromZip(zip: string): string | null {
  const prefix = parseInt(zip.substring(0, 3), 10);
  const map: [number, number, string][] = [
    [995, 999, "AK"], [350, 369, "AL"], [716, 729, "AR"], [850, 865, "AZ"],
    [900, 961, "CA"], [800, 816, "CO"], [60, 69, "CT"], [197, 199, "DE"],
    [200, 205, "DC"], [320, 349, "FL"], [300, 319, "GA"], [967, 968, "HI"],
    [500, 528, "IA"], [832, 838, "ID"], [600, 629, "IL"], [460, 479, "IN"],
    [660, 679, "KS"], [400, 427, "KY"], [700, 714, "LA"], [10, 27, "MA"],
    [206, 219, "MD"], [39, 49, "ME"], [480, 499, "MI"], [550, 567, "MN"],
    [630, 658, "MO"], [386, 397, "MS"], [590, 599, "MT"], [270, 289, "NC"],
    [580, 588, "ND"], [680, 693, "NE"], [30, 38, "NH"], [70, 89, "NJ"],
    [870, 884, "NM"], [889, 898, "NV"], [100, 149, "NY"], [430, 459, "OH"],
    [730, 749, "OK"], [970, 979, "OR"], [150, 196, "PA"], [28, 29, "RI"],
    [290, 299, "SC"], [570, 577, "SD"], [370, 385, "TN"], [750, 799, "TX"],
    [840, 847, "UT"], [220, 246, "VA"], [50, 59, "VT"], [980, 994, "WA"],
    [530, 549, "WI"], [247, 268, "WV"], [820, 831, "WY"],
  ];
  for (const [lo, hi, st] of map) {
    if (prefix >= lo && prefix <= hi) return st;
  }
  return null;
}

// ═══ Web Search ═══
const SEARCH_TRIGGERS = [
  // Candidates & people
  'who is', 'candidate', 'candidates', 'running for', 'voting record',
  'campaign', 'donated', 'endorsed', 'stance on', 'position on',
  // Legislation
  'bill', 'hr ', 'sb ', 'hb ', 's.', 'h.r.', 'senate bill', 'house bill',
  'passed', 'signed', 'vetoed', 'status of', 'legislation', 'law',
  // Time-sensitive
  'latest', 'recent', 'today', 'this week', 'just happened',
  'current', 'now', 'update', 'news', 'this year', '2026', '2025',
  // Elections
  'city council', 'mayor', 'school board', 'election results',
  'won', 'lost', 'primary', 'general election', 'midterm', 'midterms',
  'ballot', 'race', 'poll', 'polls', 'senate race', 'house race',
  'governor', 'senator', 'congressman', 'representative',
  // Research intent
  'tell me about', 'research', 'find out', 'look up',
  'search for', 'what happened', 'who represents', 'my rep',
  'register', 'registration deadline', 'polling place', 'polling location',
  'vote by mail', 'absentee', 'early voting',
];

function shouldSearch(message: string): boolean {
  const lower = message.toLowerCase();
  return SEARCH_TRIGGERS.some(t => lower.includes(t));
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function buildSearchQuery(message: string, state: string | null, zipCode: string | null): string {
  let query = message;
  if (query.length > 120) query = query.substring(0, 120);
  if (state) query += ` ${state}`;
  else if (zipCode) query += ` ${zipCode}`;
  query += ` ${new Date().getFullYear()}`;
  return query;
}

async function searchWeb(query: string): Promise<SearchResult[]> {

  const BRAVE_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");

  

  // Try Brave Search first (reliable, real-time)

  if (BRAVE_API_KEY) {

    try {

      const resp = await fetch(

        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6&search_lang=en&country=us&freshness=pw`,

        {

          headers: {

            'Accept': 'application/json',

            'Accept-Encoding': 'gzip',

            'X-Subscription-Token': BRAVE_API_KEY,

          },

        }

      );

      if (resp.ok) {

        const data = await resp.json();

        const results: SearchResult[] = (data.web?.results || []).slice(0, 6).map((r: any) => ({

          title: r.title || '',

          url: r.url || '',

          snippet: r.description || '',

        }));

        if (results.length > 0) {

          console.log(`[ask-uwazi] Brave Search returned ${results.length} results`);

          return results;

        }

      }

    } catch (e) {

      console.error('Brave Search failed, falling back to DDG:', e);

    }

  }

  // Fallback: DuckDuckGo scrape (existing logic)

  try {

    const resp = await fetch('https://html.duckduckgo.com/html/', {

      method: 'POST',

      headers: {

        'Content-Type': 'application/x-www-form-urlencoded',

        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

      },

      body: `q=${encodeURIComponent(query)}&kl=us-en`,

    });

    const html = await resp.text();

    const results: SearchResult[] = [];

    const linkRegex = /<a\s+[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

    const snippetRegex = /<a\s+[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const links: { url: string; title: string }[] = [];

    const snippets: string[] = [];

    let m;

    while ((m = linkRegex.exec(html)) !== null) {

      let url = m[1];

      const uddgMatch = url.match(/uddg=([^&]*)/);

      if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);

      const title = m[2].replace(/<[^>]*>/g, '').trim();

      if (url && title && url.startsWith('http')) links.push({ url, title });

    }

    while ((m = snippetRegex.exec(html)) !== null) {

      snippets.push(m[1].replace(/<[^>]*>/g, '').trim());

    }

    for (let i = 0; i < Math.min(links.length, 6); i++) {

      results.push({ title: links[i].title, url: links[i].url, snippet: snippets[i] || '' });

    }

    console.log(`[ask-uwazi] DDG fallback returned ${results.length} results`);

    return results;

  } catch (e) {

    console.error('All search methods failed:', e);

    return [];

  }

}

// ═══ Question Intelligence Logger ═══
async function logQuestion(
  supabase: any,
  apiKey: string,
  userId: string | null,
  questionText: string,
  zipCode: string | null,
  stateCode: string | null,
  didSearch: boolean,
) {
  try {
    // Step 1: Classify using Lovable AI (fast model)
    let classData: any = { topic_category: 'general', intent_type: 'education' };
    try {
      const classResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{
            role: "user",
            content: `Classify this civic question for research purposes.
Question: "${questionText}"

Respond with ONLY valid JSON, no markdown:
{
  "topic_category": "voting|legislation|local_gov|candidates|rights|policy|civic_process|general|other",
  "sub_topic": "specific sub-topic in 3-5 words",
  "intent_type": "research|education|action|confusion|verification|comparison",
  "complexity_level": "beginner|intermediate|advanced",
  "is_local_question": true or false,
  "suggested_lesson_title": "If this reveals a lesson gap, suggest a lesson title. Otherwise null"
}`
          }],
        }),
      });
      if (classResp.ok) {
        const classJson = await classResp.json();
        const text = classJson.choices?.[0]?.message?.content || '{}';
        classData = JSON.parse(text.replace(/```json|```/g, '').trim());
      }
    } catch (e) {
      console.error("[question-log] Classification failed:", e);
    }

    // Step 2: Check if existing lesson covers this topic
    const { data: existingLessons } = await supabase
      .from('lessons')
      .select('id, title, category')
      .eq('is_published', true)
      .ilike('category', `%${classData.topic_category || 'general'}%`);
    const hasMatchingLesson = (existingLessons?.length ?? 0) > 0;

    // Step 3: Log to database
    await supabase.from('uwazi_question_log').insert({
      user_id: userId,
      question_text: questionText,
      question_length: questionText.length,
      topic_category: classData.topic_category || 'general',
      sub_topic: classData.sub_topic || null,
      intent_type: classData.intent_type || 'education',
      complexity_level: classData.complexity_level || 'beginner',
      is_local_question: classData.is_local_question || false,
      zip_code: zipCode,
      state_code: stateCode,
      required_web_search: didSearch,
      has_matching_lesson: hasMatchingLesson,
      suggested_lesson_title: classData.suggested_lesson_title || null,
      lesson_gap_priority: !hasMatchingLesson ? 'high' : 'low',
    });

    // Step 4: Upsert lesson gap recommendation if needed
    if (!hasMatchingLesson && classData.suggested_lesson_title) {
      const { data: existing } = await supabase
        .from('lesson_gap_recommendations')
        .select('id, question_count, example_questions')
        .eq('suggested_title', classData.suggested_lesson_title)
        .maybeSingle();

      if (existing) {
        const examples = Array.isArray(existing.example_questions) ? existing.example_questions : [];
        if (examples.length < 5) examples.push(questionText);
        await supabase
          .from('lesson_gap_recommendations')
          .update({
            question_count: (existing.question_count || 0) + 1,
            example_questions: examples,
            priority_score: (existing.question_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('lesson_gap_recommendations').insert({
          suggested_title: classData.suggested_lesson_title,
          suggested_category: classData.topic_category,
          suggested_difficulty: classData.complexity_level || 'beginner',
          question_count: 1,
          example_questions: [questionText],
          priority_score: 1,
        });
      }
    }

    console.log(`[question-log] Logged: ${classData.topic_category}/${classData.sub_topic}`);
  } catch (e) {
    console.error("[question-log] Error:", e);
  }
}

// ═══ User Profile ═══
interface UserProfile {
  full_name: string | null;
  zip_code: string | null;
  state: string | null;
  civic_score: number | null;
  lessons_completed: number | null;
  voting_plan: boolean;
  saved_bills: string[];
}

function buildSystemPrompt(profile: UserProfile, searchResults: SearchResult[] | null): string {
  const searchSection = searchResults && searchResults.length > 0 ? `

═══════════════════════════════════
WEB SEARCH RESULTS (LIVE DATA)
═══════════════════════════════════
You performed a web search. Here are the results — use them to provide current, accurate information.
Cite your sources by referencing the source number [1], [2], etc.

${searchResults.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join('\n\n')}

WHEN USING SEARCH RESULTS:
- Be transparent: mention that you searched for current information
- Cite sources using [1], [2] etc. notation
- Prioritize official government sites and reputable news
- If reporting on candidates, always note: "This is factual information. UWAZI does not endorse any candidate."
` : '';

  return `You are Ask Uwazi — a nonpartisan, AI-powered civic intelligence assistant built by UWAZI.AI and powered by Raia G1.0.
TODAY: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

ELECTION CONTEXT: The 2026 U.S. midterm elections are November 3, 2026. We are in active midterms season.

CRITICAL: For any question about candidates, races, results, or bill status — always use current search results. Never rely on training data for time-sensitive civic information.

Your mission is to make democracy accessible, understandable, and actionable for every American — especially communities that have been historically underrepresented in civic life.

═══════════════════════════════════
IDENTITY & VOICE
═══════════════════════════════════
- Name: Ask Uwazi ("Uwazi" means transparency/clarity in Swahili)
- Tone: Warm, direct, empowering — like a knowledgeable friend who happens to know everything about civics
- Never condescending, never partisan, never preachy
- Use plain language. Break down complex policy into real impact.
- Use "you" and "your community" language
- Celebrate civic action — voting, learning, tracking bills
- Short answers for simple questions. Detailed for complex ones.

═══════════════════════════════════
STRICT NONPARTISAN RULES
═══════════════════════════════════
- NEVER endorse, favor, or criticize any political party, candidate, or ideology
- NEVER predict election outcomes
- NEVER use loaded political language
- When asked "who should I vote for?" → Explain how to research candidates
- When covering controversial policy → Present multiple perspectives fairly

═══════════════════════════════════
USER CONTEXT
═══════════════════════════════════
${profile.full_name ? `User's name: ${profile.full_name}` : ""}
${profile.zip_code ? `ZIP code: ${profile.zip_code}\nState: ${profile.state || "Unknown"}` : "Location: Not set"}
${profile.civic_score !== null ? `Civic Literacy Score: ${profile.civic_score}/100` : ""}
${profile.lessons_completed ? `Lessons completed: ${profile.lessons_completed}` : ""}
${profile.voting_plan ? "Has voting plan: Yes" : ""}
${profile.saved_bills.length ? `Tracking bills: ${profile.saved_bills.join(", ")}` : ""}
${searchSection}

═══════════════════════════════════
CIVIC KNOWLEDGE BASE
═══════════════════════════════════
You are an expert on: elections & voting, ballot comprehension, legislation & policy, local government, civic rights & participation, and policy impact areas (housing, education, healthcare, criminal justice, environment, economy, immigration).

═══════════════════════════════════
RESPONSE PATTERNS
═══════════════════════════════════
- Direct answer first, then context
- Specific to user's state/ZIP when known
- End civic action responses with next steps referencing UWAZI tools

═══════════════════════════════════
WHAT UWAZI IS
═══════════════════════════════════
If asked: "UWAZI.AI is a nonpartisan civic education platform built to make democracy accessible to everyone. We're powered by Raia G1.0 and backed by the Raia Institute — a 501c3 nonprofit."
If asked who built it: "UWAZI was founded by Mychal Shaw and built by the team at the Raia Institute, a nonprofit based in Kansas City, MO."

Format responses using markdown with headers, bullet points, and bold text for clarity.

═══════════════════════════════════
RESPONSE LENGTH — KEEP IT SHORT
═══════════════════════════════════
- Default to SHORT, scannable answers (2–5 sentences, or a tight bulleted list).
- Lead with the direct answer in the first sentence. No preamble, no throat-clearing.
- Only go longer when the user explicitly asks for "details", "explain in depth", or the question genuinely requires it (e.g. multi-step process, complex bill breakdown).
- Prefer 1–2 short bullets over a long paragraph. Cut anything that isn't useful.
- No "I hope this helps" or sign-offs.

═══════════════════════════════════
SUGGESTED FOLLOW-UP QUESTIONS — REQUIRED
═══════════════════════════════════
At the very end of EVERY response, append a single line in this exact format:

<followups>Question one? | Question two? | Question three?</followups>

Rules:
- ALWAYS include this block. No exceptions.
- Provide 3 (max 4) short follow-up questions the user is likely to ask next, given the topic and their context (ZIP, state, civic score).
- Each question must be under 60 characters, written from the USER's perspective ("How do I…", "Who is…", "What's…").
- Make them specific and actionable — not generic ("Tell me more" is forbidden).
- Pipe-separated (|), no numbering, no bullets, no quotes.
- Place this on its own final line. Do not wrap it in code fences. Do not add anything after it.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userProfile: UserProfile = {
      full_name: null, zip_code: null, state: null,
      civic_score: null, lessons_completed: null,
      voting_plan: false, saved_bills: [],
    };

    let userId: string | null = null;
    let supabase: any = null;

    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        supabase = createClient(supabaseUrl, supabaseServiceKey);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          userId = user.id;
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

    // Web Search
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const performSearch = shouldSearch(lastUserMessage);
    let searchResults: SearchResult[] = [];
    let searchQuery = '';

    if (performSearch) {
      searchQuery = buildSearchQuery(lastUserMessage, userProfile.state, userProfile.zip_code);
      console.log(`[ask-uwazi] Web search: "${searchQuery}"`);
      searchResults = await searchWeb(searchQuery);
      console.log(`[ask-uwazi] Found ${searchResults.length} results`);
    }

    const systemPrompt = buildSystemPrompt(userProfile, searchResults.length > 0 ? searchResults : null);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage credits exhausted. Please add funds in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ Fire-and-forget question logging ═══
    if (supabase && lastUserMessage.trim()) {
      logQuestion(
        supabase, LOVABLE_API_KEY, userId,
        lastUserMessage, userProfile.zip_code, userProfile.state,
        performSearch,
      ).catch(err => console.error('[question-log] Async error:', err));
    }

    // Custom stream with search metadata
    const encoder = new TextEncoder();
    const aiStream = response.body!;
    const customStream = new ReadableStream({
      async start(controller) {
        if (searchResults.length > 0) {
          const meta = JSON.stringify({
            type: "search_meta",
            sources: searchResults.map(r => ({ title: r.title, url: r.url })),
            queries: [searchQuery],
            didSearch: true,
          });
          controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
        }
        const reader = aiStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          console.error("Stream pipe error:", e);
        }
        controller.close();
      },
    });

    return new Response(customStream, {
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
