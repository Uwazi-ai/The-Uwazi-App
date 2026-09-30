// Voting coverage for Ask UWAZI. Decides, per turn, whether we have a real
// polling place and a real ballot for this person, and gives the model their
// official election office plus the officials we can confirm from their codes.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const VOTING_Q = /\b(where (do|can|should) i vote|polling|poll place|precinct|vote early|early voting|on my ballot|my ballot|ballot|how (do|can) i vote|how to vote|where to vote|vote in my state)\b/i;

const STATE_OFFICE: Record<string, { name: string; url: string }> = {
  MO: { name: "the Missouri Secretary of State", url: "https://www.sos.mo.gov/elections" },
  KS: { name: "the Kansas Secretary of State", url: "https://sos.ks.gov/elections/elections.html" },
  IL: { name: "the Illinois State Board of Elections", url: "https://www.elections.il.gov" },
  CA: { name: "the California Secretary of State", url: "https://www.sos.ca.gov/elections" },
  TX: { name: "the Texas Secretary of State", url: "https://www.sos.state.tx.us/elections" },
  NY: { name: "the New York State Board of Elections", url: "https://elections.ny.gov" },
  FL: { name: "the Florida Division of Elections", url: "https://dos.fl.gov/elections" },
  OH: { name: "the Ohio Secretary of State", url: "https://www.ohiosos.gov/elections" },
  PA: { name: "the Pennsylvania Department of State", url: "https://www.vote.pa.gov" },
  GA: { name: "the Georgia Secretary of State", url: "https://sos.ga.gov/elections-division-georgia-secretary-states-office" },
};

const STATE_NAME: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

const num = (v: unknown) => { const n = parseInt(String(v ?? ""), 10); return Number.isFinite(n) ? String(n) : null; };

async function federalOfficials(state: string, cd: string | null): Promise<string[]> {
  const key = Deno.env.get("CONGRESS_API_KEY");
  if (!key) return [];
  const out: string[] = [];
  try {
    const r = await fetch(`https://api.congress.gov/v3/member/${state}?currentMember=true&limit=250&format=json&api_key=${key}`, { signal: AbortSignal.timeout(6000) });
    const j = await r.json();
    for (const m of j?.members ?? []) {
      const terms = m?.terms?.item ?? [];
      const last = terms[terms.length - 1];
      const nm = m.name?.includes(",") ? m.name.split(",").reverse().join(" ").trim() : m.name;
      if (last?.chamber === "Senate") out.push(`US Senator: ${nm}`);
      else if (cd && String(m.district) === cd) out.push(`US House, district ${cd}: ${nm}`);
    }
  } catch (e) { console.warn("congress lookup failed", e); }
  return out;
}

async function stateOfficials(state: string, upper: string | null, lower: string | null): Promise<string[]> {
  const key = Deno.env.get("OPENSTATES_API_KEY") ?? Deno.env.get("VITE_OPENSTATES_API_KEY");
  if (!key) return [];
  const out: string[] = [];
  const one = async (org: "upper" | "lower", d: string | null, label: string) => {
    if (!d) return;
    try {
      const r = await fetch(`https://v3.openstates.org/people?jurisdiction=${state.toLowerCase()}&org_classification=${org}&district=${d}&per_page=5`, { headers: { "X-API-KEY": key }, signal: AbortSignal.timeout(6000) });
      const j = await r.json();
      for (const p of j?.results ?? []) out.push(`${label}, district ${d}: ${p.name}`);
    } catch (e) { console.warn("openstates failed", e); }
  };
  await Promise.all([one("upper", upper, "State Senate"), one("lower", lower, "State House")]);
  return out;
}

export async function buildVotingContext(
  supabase: SupabaseClient, userId: string, savedPrecinct: string | null,
  kcebLookup: (i: Record<string, unknown>) => string,
): Promise<string> {
  const [{ data: prof }, { data: ud }] = await Promise.all([
    supabase.from("profiles").select("state_code, location, county_name, election_authority_key").eq("user_id", userId).maybeSingle(),
    supabase.from("user_districts").select("resolved, precision").eq("user_id", userId).maybeSingle(),
  ]);
  const r = ((ud as any)?.resolved ?? {}) as Record<string, string>;
  const state = ((prof as any)?.state_code || (prof as any)?.location || "").toUpperCase() || null;
  const county = (prof as any)?.county_name as string | null;
  const authKey = (prof as any)?.election_authority_key as string | null;

  // Polling coverage: the election authority poll log has their precinct.
  let polling: any = null;
  const m = String(savedPrecinct ?? "").match(/(\d+)\D+(\d+)/);
  if (m) { try { const x = JSON.parse(kcebLookup({ ward: Number(m[1]), precinct: Number(m[2]) })); if (x?.polling_place) polling = x; } catch { /* none */ } }

  // Ballot coverage: the ballot pipeline has contests for their districts.
  let ballotCount = 0;
  if (state) {
    let q = supabase.from("ballot_contests").select("id", { count: "exact", head: true })
      .eq("state", state).gte("election_date", new Date().toISOString().slice(0, 10));
    q = authKey ? q.or(`authority_key.is.null,authority_key.eq.${authKey}`) : q.is("authority_key", null);
    const { count } = await q;
    ballotCount = count ?? 0;
  }
  const ballotCovered = ballotCount > 0 || !!polling;

  // Official election office.
  let office = "";
  if (authKey) {
    const { data: ea } = await supabase.from("election_authorities").select("display_name, website, lookup_url").eq("key", authKey).maybeSingle();
    if (ea) office = `${(ea as any).display_name}, ${(ea as any).lookup_url || (ea as any).website}`;
  }
  const so = state ? STATE_OFFICE[state] : null;
  const stateOffice = so ? `${so.name}, ${so.url}` : state ? `the ${STATE_NAME[state] ?? state} state election office, https://vote.gov` : "your state election office, https://vote.gov";
  const countyOffice = county ? `the ${county.replace(/ county$/i, "")} County election office. Tell them to search for it by that name.` : "your county election office";

  // Officials we can confirm from their codes.
  let officials: string[] = [];
  if (!polling || !ballotCovered) {
    const [fed, st, local] = await Promise.all([
      state ? federalOfficials(state, num(r.congressional)) : Promise.resolve([]),
      state ? stateOfficials(state, num(r.state_senate), num(r.state_house)) : Promise.resolve([]),
      supabase.rpc("get_my_offices", { _user_id: userId }).then(({ data }) => (data ?? []) as any[]),
    ]);
    officials = [...fed, ...st, ...local.map((o) => `${o.office_title}: ${o.current_holder ?? "no one listed"}`)];
  }

  const lines = [
    "# Voting coverage for this person, decided by the server. Follow it exactly.",
    `State: ${state ? STATE_NAME[state] ?? state : "unknown"}. County: ${county ?? "unknown"}. School district code: ${r.school_district ?? "unknown"}.`,
    polling
      ? `POLLING: COVERED. Polling place from the election board poll log: ${JSON.stringify(polling.polling_place)}. Ward ${m?.[1]}, precinct ${m?.[2]}.`
      : "POLLING: NOT COVERED. We do not have polling places for this person's area. Do not call any lookup tool for a polling place. Never name, guess, or suggest a polling place.",
    ballotCovered
      ? `BALLOT: COVERED. ${ballotCount} contests in our ballot pipeline. Use get_user_ballot or kc_poll_ballot_lookup for the contests.`
      : "BALLOT: NOT COVERED. We do not have ballot contests for this person's area. Do not call any lookup tool for ballot contents. Never name, guess, or list a race, candidate, or ballot question.",
    `Official sources: ${office ? office + ". Also " : ""}${stateOffice}. County: ${countyOffice}`,
  ];
  if (!polling || !ballotCovered) {
    lines.push(
      officials.length ? `Officials we can confirm for them:\n- ${officials.join("\n- ")}` : "We could not confirm their officials right now. Say so and point to the state office.",
      "For each NOT COVERED piece: one short honest sentence that we do not have it for their area yet, then name the official source above with its link. Answer any COVERED piece normally. Then share their state, county, and the officials above. End with one clear next step and offer to add their city to our list so we build it sooner.",
    );
  }
  return lines.join("\n");
}
