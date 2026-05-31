// Fetches public spending data for a ZIP at city/state/federal level, normalizes,
// auto-generates transparency flags, and upserts into zip_investment_cache.
// Called internally by resolve-address using the service role key.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BodySchema = z.object({
  zip_code: z.string().regex(/^\d{5}$/),
  level: z.enum(["city", "state", "federal"]),
});

const FISCAL_YEAR = "2024";
const HOUSEHOLD_FALLBACK = 11317;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), ms)),
  ]);
}

function deriveStatus(start?: string, end?: string) {
  const today = new Date();
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (e && e < today) return { status: "Complete", progress_pct: 100 };
  if (s && s > today) return { status: "Approved", progress_pct: 5 };
  if (s && e) {
    const total = e.getTime() - s.getTime();
    const elapsed = today.getTime() - s.getTime();
    const pct = Math.max(5, Math.min(95, Math.round((elapsed / total) * 100)));
    return { status: "Active", progress_pct: pct };
  }
  return { status: "Active", progress_pct: 50 };
}

function mapFederalCategory(agency = "") {
  if (/EPA/i.test(agency)) return "Water/EPA";
  if (/Transportation/i.test(agency)) return "Transit";
  if (/HUD|Housing/i.test(agency)) return "Housing/HUD";
  if (/Labor/i.test(agency)) return "Workforce";
  return "Federal Programs";
}

function mapCityCategory(dept = "") {
  if (/Public Works/i.test(dept)) return "Infrastructure";
  if (/Parks/i.test(dept)) return "Parks & Recreation";
  if (/Police|Fire/i.test(dept)) return "Public Safety";
  if (/Water/i.test(dept)) return "Utilities";
  if (/Transit|KCATA/i.test(dept)) return "Transit";
  if (/Health/i.test(dept)) return "Health & Social";
  return "City Operations";
}

// ---------- FEDERAL (USASpending) ----------
async function fetchFederal(zip: string) {
  const sources = ["USASpending.gov"];
  const filters = {
    place_of_performance_locations: [{ country: "USA", zip }],
    time_period: [{ start_date: "2023-10-01", end_date: "2024-09-30" }],
    award_type_codes: ["A", "B", "C", "D", "02", "03", "04", "05"],
  };
  let awards: any[] = [];
  try {
    const res = await withTimeout(
      fetch("https://api.usaspending.gov/api/v2/search/spending_by_award/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters,
          fields: [
            "Award ID", "Recipient Name", "Award Amount", "Awarding Agency",
            "Award Type", "Description", "recipient_location_zip5",
            "naics_code", "naics_description",
            "period_of_performance_start_date", "period_of_performance_current_end_date",
          ],
          page: 1, limit: 50, sort: "Award Amount", order: "desc",
        }),
      }),
      8000,
    );
    if (res.ok) {
      const data = await res.json();
      awards = data.results || [];
    }
  } catch (e) {
    console.error("USASpending awards failed:", e);
  }

  const projects = awards.map((a) => {
    const start = a.period_of_performance_start_date;
    const end = a.period_of_performance_current_end_date;
    const status = deriveStatus(start, end);
    const desc: string = a.Description || a["Award ID"] || "Federal award";
    return {
      id: a["Award ID"],
      name: desc.length > 60 ? desc.slice(0, 57) + "…" : desc,
      vendor: a["Recipient Name"],
      amount: Number(a["Award Amount"]) || 0,
      category: mapFederalCategory(a["Awarding Agency"]),
      contract_type: a["Award Type"] || null,
      naics: a.naics_code ? `${a.naics_code} — ${a.naics_description ?? ""}` : null,
      start_date: start,
      end_date: end,
      ...status,
    };
  });

  const vendorMap = new Map<string, number>();
  for (const p of projects) {
    if (!p.vendor) continue;
    vendorMap.set(p.vendor, (vendorMap.get(p.vendor) || 0) + p.amount);
  }
  const vendors = Array.from(vendorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name, amount, is_local: null as boolean | null,
      certifications: [] as string[], locality: "Unknown",
    }));

  const total = projects.reduce((s, p) => s + p.amount, 0);
  return {
    total_investment: total,
    projects,
    vendors,
    meta_json: {
      per_household: total / HOUSEHOLD_FALLBACK,
      money_flow: { local_pct: 0, state_pct: 0, regional_pct: 0, national_pct: 100 },
    },
    data_sources: sources,
  };
}

// ---------- CITY (KC Open Data) ----------
async function fetchCity(zip: string) {
  const endpoints = [
    "https://data.kcmo.org/resource/sxnt-s7cb.json",
    "https://data.kcmo.org/resource/hzjc-4ixt.json",
    "https://data.kcmo.org/resource/ps2i-h4in.json",
  ];
  let rows: any[] = [];
  let usedSource: string | null = null;
  for (const ep of endpoints) {
    try {
      const url = `${ep}?$where=zip_code='${zip}'&$limit=200&$order=amount DESC`;
      const res = await withTimeout(fetch(url), 8000);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          rows = data;
          usedSource = ep;
          break;
        }
      }
    } catch (e) {
      console.error("KC endpoint failed", ep, e);
    }
  }

  if (!rows.length) {
    return {
      total_investment: 0,
      projects: [],
      vendors: [],
      meta_json: { error: "KC_OPENDATA_UNAVAILABLE" },
      data_sources: ["KC Open Data (unavailable)"],
    };
  }

  const projects = rows.map((r, i) => {
    const amount = Number(r.amount ?? r.payment_amount ?? r.contract_amount ?? 0);
    const desc = r.description || r.purpose || r.contract_description || "City expenditure";
    const status = deriveStatus(r.start_date, r.end_date);
    return {
      id: r.id || r.payment_id || r.contract_id || `kc-${i}`,
      name: typeof desc === "string" && desc.length > 60 ? desc.slice(0, 57) + "…" : desc,
      vendor: r.vendor_name || r.vendor || r.payee || "Unknown vendor",
      amount,
      category: mapCityCategory(r.department || r.dept || ""),
      contract_type: r.contract_type || null,
      naics: null,
      start_date: r.start_date || null,
      end_date: r.end_date || null,
      ...status,
    };
  });

  const vendorMap = new Map<string, number>();
  for (const p of projects) vendorMap.set(p.vendor, (vendorMap.get(p.vendor) || 0) + p.amount);
  const vendors = Array.from(vendorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name, amount, is_local: true, certifications: [] as string[], locality: "Kansas City, MO",
    }));

  const total = projects.reduce((s, p) => s + p.amount, 0);
  return {
    total_investment: total,
    projects,
    vendors,
    meta_json: {
      per_household: total / HOUSEHOLD_FALLBACK,
      money_flow: { local_pct: 100, state_pct: 0, regional_pct: 0, national_pct: 0 },
    },
    data_sources: ["KC Open Data", usedSource ?? ""].filter(Boolean) as string[],
  };
}

// ---------- STATE (MO checkbook fallback to USASpending) ----------
async function fetchState(zip: string) {
  let rows: any[] = [];
  let source = "USASpending.gov (MO state filter)";
  try {
    const url = `https://checkbook.mo.gov/api/v1/payments?zip=${zip}&fiscal_year=2024&format=json`;
    const res = await withTimeout(fetch(url), 6000);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.payments) && data.payments.length) {
        rows = data.payments;
        source = "MO Checkbook";
      }
    }
  } catch (e) {
    console.warn("MO checkbook unavailable, falling back:", e);
  }

  if (rows.length) {
    const projects = rows.map((r, i) => {
      const amount = Number(r.amount ?? 0);
      const status = deriveStatus(r.start_date, r.end_date);
      return {
        id: r.id || `mo-${i}`,
        name: r.description || r.purpose || "State expenditure",
        vendor: r.vendor || r.payee || "Unknown vendor",
        amount,
        category: r.department || "State Programs",
        contract_type: r.contract_type || null,
        naics: null,
        start_date: r.start_date || null,
        end_date: r.end_date || null,
        ...status,
      };
    });
    const vendorMap = new Map<string, number>();
    for (const p of projects) vendorMap.set(p.vendor, (vendorMap.get(p.vendor) || 0) + p.amount);
    const vendors = Array.from(vendorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount, is_local: true, certifications: [], locality: "MO" }));
    const total = projects.reduce((s, p) => s + p.amount, 0);
    return {
      total_investment: total,
      projects, vendors,
      meta_json: {
        per_household: total / HOUSEHOLD_FALLBACK,
        money_flow: { local_pct: 0, state_pct: 100, regional_pct: 0, national_pct: 0 },
      },
      data_sources: [source],
    };
  }

  // Fallback: USASpending state-level
  try {
    const res = await withTimeout(
      fetch("https://api.usaspending.gov/api/v2/search/spending_by_award/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: {
            recipient_location_states: [{ state: "MO" }],
            time_period: [{ start_date: "2023-10-01", end_date: "2024-09-30" }],
            award_type_codes: ["A", "B", "C", "D", "02", "03", "04", "05"],
          },
          fields: [
            "Award ID", "Recipient Name", "Award Amount", "Awarding Agency",
            "Award Type", "Description",
            "period_of_performance_start_date", "period_of_performance_current_end_date",
          ],
          page: 1, limit: 30, sort: "Award Amount", order: "desc",
        }),
      }),
      8000,
    );
    const data = res.ok ? await res.json() : { results: [] };
    const projects = (data.results || []).map((a: any) => {
      const status = deriveStatus(
        a.period_of_performance_start_date,
        a.period_of_performance_current_end_date,
      );
      const desc: string = a.Description || a["Award ID"] || "State-level award";
      return {
        id: a["Award ID"],
        name: desc.length > 60 ? desc.slice(0, 57) + "…" : desc,
        vendor: a["Recipient Name"],
        amount: Number(a["Award Amount"]) || 0,
        category: mapFederalCategory(a["Awarding Agency"]),
        contract_type: a["Award Type"] || null,
        naics: null,
        start_date: a.period_of_performance_start_date,
        end_date: a.period_of_performance_current_end_date,
        ...status,
      };
    });
    const vendorMap = new Map<string, number>();
    for (const p of projects) vendorMap.set(p.vendor, (vendorMap.get(p.vendor) || 0) + p.amount);
    const vendors = Array.from(vendorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount, is_local: true, certifications: [], locality: "MO" }));
    const total = projects.reduce((s, p) => s + p.amount, 0);
    return {
      total_investment: total,
      projects, vendors,
      meta_json: {
        per_household: total / HOUSEHOLD_FALLBACK,
        state_data_limited: true,
        money_flow: { local_pct: 0, state_pct: 100, regional_pct: 0, national_pct: 0 },
      },
      data_sources: ["USASpending.gov (MO state filter)"],
    };
  } catch (e) {
    console.error("State fallback failed:", e);
    return {
      total_investment: 0, projects: [], vendors: [],
      meta_json: { error: "STATE_UNAVAILABLE" },
      data_sources: ["MO Checkbook (unavailable)"],
    };
  }
}

// ---------- SAM.gov vendor enrichment ----------
async function enrichVendors(vendors: any[]) {
  const key = Deno.env.get("SAM_GOV_API_KEY") || Deno.env.get("VITE_SAM_GOV_API_KEY");
  if (!key) return vendors;
  const top = vendors.slice(0, 10);
  await Promise.all(
    top.map(async (v) => {
      try {
        const url = `https://api.sam.gov/entity-information/v3/entities?api_key=${key}&legalBusinessName=${encodeURIComponent(
          v.name,
        )}&registrationStatus=A&format=json`;
        const res = await withTimeout(fetch(url), 5000);
        if (!res.ok) return;
        const data = await res.json();
        const entity = data.entityData?.[0];
        if (!entity) return;
        const addr = entity.entityRegistration?.physicalAddress || {};
        v.is_local = addr.stateOrProvinceCode === "MO" || /kansas city/i.test(addr.city || "");
        const types: string[] = entity.entityRegistration?.businessTypeList || [];
        v.certifications = types.filter((t) => ["MN", "WO", "SB", "VB"].includes(t));
        v.locality = [addr.city, addr.stateOrProvinceCode].filter(Boolean).join(", ");
      } catch (_) {
        /* ignore */
      }
    }),
  );
  return vendors;
}

// ---------- Auto-flag generation ----------
function generateFlags(projects: any[], vendors: any[]) {
  const flags: any[] = [];

  // Flag 1: no-bid contracts
  for (const p of projects) {
    const ct = (p.contract_type || "").toLowerCase();
    if (/no.?bid|sole source|emergency|single source/.test(ct)) {
      flags.push({
        severity: "red",
        title: `${p.vendor} — ${p.contract_type} contract, $${Math.round(p.amount).toLocaleString()}`,
        description: "Awarded without competitive bidding.",
      });
    }
  }

  const totalVendorAmt = vendors.reduce((s, v) => s + (v.amount || 0), 0) || 1;

  // Flag 2: local spend
  const localAmt = vendors.filter((v) => v.is_local).reduce((s, v) => s + v.amount, 0);
  const localPct = Math.round((localAmt / totalVendorAmt) * 100);
  if (vendors.some((v) => v.is_local !== null) && localPct < 50) {
    flags.push({
      severity: "amber",
      title: `${localPct}% of spend stays in Kansas City`,
      description: `KC Local Preference Ordinance targets 50%. Currently ${50 - localPct} points below goal.`,
    });
  }

  // Flag 3: MBE/WBE
  const mbeAmt = vendors
    .filter((v) => (v.certifications || []).some((c: string) => c === "MN" || c === "WO"))
    .reduce((s, v) => s + v.amount, 0);
  const mbePct = Math.round((mbeAmt / totalVendorAmt) * 100);
  if (vendors.some((v) => (v.certifications || []).length > 0) && mbePct < 25) {
    const gap = Math.round(totalVendorAmt * 0.25 - mbeAmt);
    flags.push({
      severity: "amber",
      title: `MBE/WBE participation: ${mbePct}% vs 25% goal`,
      description: `Gap represents approximately $${gap.toLocaleString()} in underutilized equity contracts.`,
    });
  }

  // Flag 4: best practice vendor
  const certifiedLocal = vendors
    .filter((v) => v.is_local && (v.certifications || []).length > 0)
    .sort((a, b) => b.amount - a.amount)[0];
  if (certifiedLocal) {
    flags.push({
      severity: "green",
      title: `${certifiedLocal.name} — local certified vendor`,
      description: "Kansas City-based with active equity certification.",
    });
  }

  return flags;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { zip_code, level } = parsed.data;

    let result;
    if (level === "federal") result = await fetchFederal(zip_code);
    else if (level === "city") result = await fetchCity(zip_code);
    else result = await fetchState(zip_code);

    if (level === "federal" && result.vendors.length) {
      result.vendors = await enrichVendors(result.vendors);
    }

    const flags = generateFlags(result.projects, result.vendors);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await admin.from("zip_investment_cache").upsert(
      {
        zip_code,
        level,
        fiscal_year: FISCAL_YEAR,
        total_investment: result.total_investment,
        projects_json: result.projects,
        vendors_json: result.vendors,
        flags_json: flags,
        meta_json: result.meta_json,
        data_sources: result.data_sources,
        refreshed_at: new Date().toISOString(),
      },
      { onConflict: "zip_code,level,fiscal_year" },
    );

    return json({ ok: true, zip_code, level, total: result.total_investment, flags: flags.length });
  } catch (err) {
    console.error("fetch-investment-data error", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
