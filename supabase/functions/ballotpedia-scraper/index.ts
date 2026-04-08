import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New_Hampshire', 'NJ': 'New_Jersey', 'NM': 'New_Mexico', 'NY': 'New_York',
  'NC': 'North_Carolina', 'ND': 'North_Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode_Island', 'SC': 'South_Carolina',
  'SD': 'South_Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West_Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'Washington,_D.C.',
}

const buildUrls = (stateCode: string, city?: string, year = 2026) => {
  const s = STATE_NAMES[stateCode] || stateCode
  const c = city?.replace(/ /g, '_')
  return {
    stateElections: `https://ballotpedia.org/${s}_elections,_${year}`,
    cityPage: c ? `https://ballotpedia.org/${c},_${s}` : null,
    stateMeasures: `https://ballotpedia.org/${s}_${year}_ballot_measures`,
    houseRaces: `https://ballotpedia.org/United_States_House_elections_in_${s},_${year}`,
    stateSenate: `https://ballotpedia.org/${s}_State_Senate_elections,_${year}`,
    stateHouse: `https://ballotpedia.org/${s}_State_House_elections,_${year}`,
  }
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UWAZI/1.0; civic education; +https://uwazi.ai)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!res.ok) { console.error(`Fetch ${url}: ${res.status}`); return null }
    return await res.text()
  } catch (err) { console.error(`Error fetching ${url}:`, err); return null }
}

const stripHtml = (h: string) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

function normalizeParty(p: string): string {
  const l = p.toLowerCase()
  if (l.includes('democrat')) return 'Democratic'
  if (l.includes('republican')) return 'Republican'
  if (l.includes('independent')) return 'Independent'
  if (l.includes('libertarian')) return 'Libertarian'
  if (l.includes('green')) return 'Green'
  if (l.includes('nonpartisan')) return 'Nonpartisan'
  return p || 'Unknown'
}

function getPartyColor(p: string): string {
  const l = p.toLowerCase()
  if (l.includes('democrat')) return '#1d4ed8'
  if (l.includes('republican')) return '#dc2626'
  if (l.includes('libertarian')) return '#ca8a04'
  if (l.includes('green')) return '#16a34a'
  return '#6b7280'
}

function getOfficeLevel(o: string): string {
  const l = o.toLowerCase()
  if (l.includes('senate') || l.includes('house') || l.includes('congress') || l.includes('president')) return 'federal'
  if (l.includes('state') || l.includes('governor') || l.includes('attorney general')) return 'state'
  return 'local'
}

function parseCandidates(html: string, office: string, electionName: string, electionDate: string, stateCode: string): any[] {
  const candidates: any[] = []
  const tableRegex = /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[1]
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch
    let isFirst = true
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      if (isFirst) { isFirst = false; continue }
      const cells = rowMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
      if (cells.length >= 2) {
        const nameHtml = cells[0] || ''
        const partyHtml = cells[1] || ''
        const nameMatch = nameHtml.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/)
        const name = nameMatch ? stripHtml(nameMatch[2]) : stripHtml(nameHtml)
        const url = nameMatch ? (nameMatch[1].startsWith('http') ? nameMatch[1] : `https://ballotpedia.org${nameMatch[1]}`) : null
        const party = stripHtml(partyHtml)
        if (name && name.length > 2) {
          candidates.push({
            name,
            party: normalizeParty(party),
            party_color: getPartyColor(party),
            office,
            office_level: getOfficeLevel(office),
            state_code: stateCode,
            election_name: electionName,
            election_date: electionDate,
            election_year: new Date(electionDate).getFullYear(),
            election_type: 'general',
            ballotpedia_url: url,
            incumbent: rowMatch[1].toLowerCase().includes('incumbent'),
          })
        }
      }
    }
  }
  return candidates
}

function parseBallotMeasures(html: string, stateCode: string, year: number): any[] {
  const measures: any[] = []
  const section = html.match(/Ballot measures[\s\S]*?(?=<h[12])/i)
  if (!section) return measures
  const listItems = section[0].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
  for (const item of listItems) {
    const text = stripHtml(item)
    if (text.length < 10) continue
    const linkMatch = item.match(/<a[^>]*href="([^"]*)"[^>]*>/)
    measures.push({
      title: text.substring(0, 200),
      measure_number: text.substring(0, 60),
      measure_type: text.toLowerCase().includes('amendment') ? 'constitutional_amendment' : 'referendum',
      state_code: stateCode,
      jurisdiction_level: 'state',
      election_year: year,
      ballotpedia_url: linkMatch ? `https://ballotpedia.org${linkMatch[1]}` : null,
    })
  }
  return measures
}

function parseOfficials(html: string, stateCode: string, city: string): any[] {
  const officials: any[] = []
  const mayorMatch = html.match(/Mayor[^<]*<\/[^>]+>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/i)
  if (mayorMatch) {
    officials.push({
      name: stripHtml(mayorMatch[2]),
      office: 'Mayor',
      state_code: stateCode,
      city,
      ballotpedia_url: `https://ballotpedia.org${mayorMatch[1]}`,
    })
  }
  return officials
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const body = await req.json().catch(() => ({}))
    const {
      state_code = 'MO',
      city = 'Kansas City',
      year = 2026,
      scrape_type = 'all',
    } = body

    const stateFull = STATE_NAMES[state_code] || state_code
    const urls = buildUrls(state_code, city, year)
    const results = { candidates: 0, measures: 0, officials: 0, elections: 0, errors: [] as string[] }

    const { data: jobLog } = await supabase
      .from('ballotpedia_scraper_log')
      .insert({ job_type: scrape_type, state_code, city, status: 'running' })
      .select().single()

    // ── ELECTIONS ──
    if (['all', 'elections'].includes(scrape_type)) {
      const html = await fetchPage(urls.stateElections)
      if (html) {
        const linkRegex = /<a[^>]*href="(https:\/\/ballotpedia\.org\/[^"]*_\d{4}[^"]*)"[^>]*>([^<]+)<\/a>/gi
        const elections: any[] = []
        let m
        while ((m = linkRegex.exec(html)) !== null) {
          const text = stripHtml(m[2])
          if (text.length > 5 && text.includes(String(year))) {
            elections.push({
              election_name: text,
              election_date: `${year}-11-03`,
              election_type: text.toLowerCase().includes('primary') ? 'primary' : 'general',
              state_code,
              ballotpedia_url: m[1],
              is_upcoming: new Date(`${year}-11-03`) > new Date(),
              election_year: year,
            })
          }
        }
        const unique = elections.filter((e, i, arr) => arr.findIndex(x => x.election_name === e.election_name) === i).slice(0, 20)
        if (unique.length > 0) {
          await supabase.from('ballotpedia_elections').delete().eq('state_code', state_code).gte('election_date', `${year}-01-01`).lte('election_date', `${year}-12-31`)
          await supabase.from('ballotpedia_elections').insert(unique)
          results.elections = unique.length
        }
      }
    }

    // ── CANDIDATES ──
    if (['all', 'candidates'].includes(scrape_type)) {
      const raceUrls = [
        { url: urls.houseRaces, office: `U.S. House - ${stateFull}` },
        { url: urls.stateSenate, office: `${stateFull} State Senate` },
        { url: urls.stateHouse, office: `${stateFull} State House` },
      ]
      if (urls.cityPage) raceUrls.push({ url: urls.cityPage, office: 'Local Office' })

      const allCandidates: any[] = []
      for (const race of raceUrls) {
        await new Promise(r => setTimeout(r, 500))
        const html = await fetchPage(race.url)
        if (!html) continue
        allCandidates.push(...parseCandidates(html, race.office, `${stateFull} Elections ${year}`, `${year}-11-03`, state_code))
      }
      if (allCandidates.length > 0) {
        await supabase.from('ballotpedia_candidates').delete().eq('state_code', state_code).eq('election_year', year)
        for (let i = 0; i < allCandidates.length; i += 50) {
          await supabase.from('ballotpedia_candidates').insert(allCandidates.slice(i, i + 50))
        }
        results.candidates = allCandidates.length
      }
    }

    // ── MEASURES ──
    if (['all', 'measures'].includes(scrape_type)) {
      await new Promise(r => setTimeout(r, 500))
      const html = await fetchPage(urls.stateMeasures)
      if (html) {
        const measures = parseBallotMeasures(html, state_code, year)
        if (measures.length > 0) {
          await supabase.from('ballotpedia_ballot_measures').delete().eq('state_code', state_code).eq('election_year', year)
          await supabase.from('ballotpedia_ballot_measures').insert(measures)
          results.measures = measures.length
        }
      }
    }

    // ── OFFICIALS ──
    if (['all', 'officials'].includes(scrape_type) && urls.cityPage) {
      await new Promise(r => setTimeout(r, 500))
      const html = await fetchPage(urls.cityPage)
      if (html) {
        const officials = parseOfficials(html, state_code, city)
        if (officials.length > 0) {
          await supabase.from('ballotpedia_officials').delete().eq('state_code', state_code).eq('city', city)
          await supabase.from('ballotpedia_officials').insert(officials)
          results.officials = officials.length
        }
      }
    }

    // Update job log
    if (jobLog) {
      await supabase.from('ballotpedia_scraper_log').update({
        status: results.errors.length > 0 ? 'partial' : 'success',
        records_scraped: results.candidates + results.measures + results.officials + results.elections,
        completed_at: new Date().toISOString(),
      }).eq('id', jobLog.id)
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
