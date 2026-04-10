import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── STATE NAME MAP ───────────────────────────────────────
const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona',
  'AR': 'Arkansas', 'CA': 'California', 'CO': 'Colorado',
  'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida',
  'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana',
  'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts',
  'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
  'NV': 'Nevada', 'NH': 'New_Hampshire', 'NJ': 'New_Jersey',
  'NM': 'New_Mexico', 'NY': 'New_York', 'NC': 'North_Carolina',
  'ND': 'North_Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode_Island',
  'SC': 'South_Carolina', 'SD': 'South_Dakota', 'TN': 'Tennessee',
  'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West_Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'Washington,_D.C.',
}

// ─── HTML FETCHER ─────────────────────────────────────────
const fetchPage = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    })
    if (!res.ok) {
      console.log(`HTTP ${res.status} for ${url}`)
      return null
    }
    return await res.text()
  } catch (e) {
    console.error(`Fetch error for ${url}:`, e)
    return null
  }
}

// ─── STRIP HTML TAGS ──────────────────────────────────────
const strip = (html: string): string =>
  html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// ─── PARTY HELPERS ────────────────────────────────────────
const normalizeParty = (raw: string): string => {
  const p = raw.toLowerCase()
  if (p.includes('democrat')) return 'Democratic'
  if (p.includes('republican')) return 'Republican'
  if (p.includes('libertarian')) return 'Libertarian'
  if (p.includes('green')) return 'Green'
  if (p.includes('independent')) return 'Independent'
  if (p.includes('nonpartisan')) return 'Nonpartisan'
  if (p.includes('constitution')) return 'Constitution'
  return raw.trim() || 'Unknown'
}

const partyColor = (party: string): string => {
  switch (party) {
    case 'Democratic': return '#1d4ed8'
    case 'Republican': return '#dc2626'
    case 'Libertarian': return '#ca8a04'
    case 'Green': return '#16a34a'
    case 'Constitution': return '#7c3aed'
    default: return '#6b7280'
  }
}

// ─── HELPERS ──────────────────────────────────────────────
const getOfficeLevel = (office: string): string => {
  const o = office.toLowerCase()
  if (o.includes('u.s.') || (o.includes('senate') && o.includes('united')) || o.includes('congress')) return 'federal'
  if (o.includes('state') || o.includes('governor') || o.includes('attorney general')) return 'state'
  return 'local'
}

const getMeasureType = (title: string): string => {
  const t = title.toLowerCase()
  if (t.includes('constitutional') || t.includes('amendment')) return 'constitutional_amendment'
  if (t.includes('bond')) return 'bond'
  if (t.includes('initiative')) return 'initiative'
  if (t.includes('proposition') || t.includes('prop')) return 'statute'
  return 'referendum'
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── CANDIDATE BIO PARSER ─────────────────────────────────
// Fetches an individual candidate's Ballotpedia page and extracts:
// - Bio summary (first paragraph of article body)
// - Website URL (from infobox sidebar)
// - Political positions (from "Political positions" or "Key positions" section)
// - Prior office held
const parseCandidateBio = (html: string): {
  bio: string | null
  website_url: string | null
  positions: Array<{ topic: string; detail: string }> | null
  prior_office: string | null
} => {
  const result = {
    bio: null as string | null,
    website_url: null as string | null,
    positions: null as Array<{ topic: string; detail: string }> | null,
    prior_office: null as string | null,
  }

  // Extract bio: first <p> in mw-parser-output that has substantial text
  const contentMatch = html.match(
    /div[^>]*class="[^"]*mw-parser-output[^"]*"[^>]*>([\s\S]*)/
  )
  if (contentMatch) {
    const paragraphs = contentMatch[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)
    for (const p of paragraphs) {
      const text = strip(p[1])
      // Skip short/noise paragraphs, get the first real one
      if (text.length > 80 && !text.startsWith('This article') && !text.startsWith('Ballotpedia')) {
        result.bio = text.slice(0, 500)
        break
      }
    }
  }

  // Extract website from infobox
  const infoboxMatch = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i)
  if (infoboxMatch) {
    const websiteMatch = infoboxMatch[1].match(
      /(?:website|campaign\s*site|official\s*site)[^<]*<[^>]*href="([^"]+)"/i
    ) || infoboxMatch[1].match(
      /<a[^>]*class="[^"]*external[^"]*"[^>]*href="(https?:\/\/(?!ballotpedia|en\.wikipedia)[^"]+)"/i
    )
    if (websiteMatch) {
      result.website_url = websiteMatch[1]
    }
  }

  // Extract political positions section
  const posSection = html.match(
    /(?:Political\s+positions?|Key\s+positions?|Policy\s+positions?|Issues?\s+and\s+positions?)<\/(?:span|h[234])>([\s\S]*?)(?=<h[23]|<div[^>]*class="[^"]*navbox)/i
  )
  if (posSection) {
    const positions: Array<{ topic: string; detail: string }> = []
    // Look for bold topic followed by text, or <li> items with structure
    const items = posSection[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)
    for (const item of items) {
      const text = strip(item[1])
      if (text.length < 10 || text.length > 300) continue
      // Try to split on colon or bold tag
      const boldMatch = item[1].match(/<b>(.*?)<\/b>\s*[:\-–]?\s*([\s\S]*)/)
      if (boldMatch) {
        positions.push({ topic: strip(boldMatch[1]), detail: strip(boldMatch[2]).slice(0, 200) })
      } else if (text.includes(':')) {
        const [topic, ...rest] = text.split(':')
        positions.push({ topic: topic.trim(), detail: rest.join(':').trim().slice(0, 200) })
      }
      if (positions.length >= 8) break
    }
    if (positions.length > 0) result.positions = positions
  }

  // Extract prior office
  const priorMatch = html.match(
    /(?:Previous\s+office|Former\s+office|Prior\s+office|Other\s+offices?\s+held)[^<]*(?:<\/[^>]+>)?\s*(?:<[^>]+>)*([\s\S]*?)(?=<\/(?:li|p|td|tr)>)/i
  )
  if (priorMatch) {
    const prior = strip(priorMatch[1])
    if (prior.length > 3 && prior.length < 150) {
      result.prior_office = prior
    }
  }

  return result
}

// ─── ENRICH RACE_CANDIDATES WITH BIOS ─────────────────────
const enrichRaceCandidates = async (
  supabase: any,
  stateCode: string
) => {
  // Get all race_candidates for this state that have a ballotpedia_url but no bio
  const { data: races } = await supabase
    .from('election_races')
    .select('id')
    .eq('state', stateCode)

  if (!races?.length) return 0

  const raceIds = races.map((r: any) => r.id)
  const { data: candidates } = await supabase
    .from('race_candidates')
    .select('id, name, ballotpedia_url, bio')
    .in('race_id', raceIds)
    .not('ballotpedia_url', 'is', null)

  if (!candidates?.length) return 0

  let enriched = 0
  for (const cand of candidates) {
    // Skip if already has bio
    if (cand.bio) continue
    if (!cand.ballotpedia_url) continue

    console.log(`Enriching bio: ${cand.name} — ${cand.ballotpedia_url}`)
    const html = await fetchPage(cand.ballotpedia_url)
    if (!html) {
      await sleep(400)
      continue
    }

    const bioData = parseCandidateBio(html)
    const updates: Record<string, any> = {}
    if (bioData.bio) updates.bio = bioData.bio
    if (bioData.website_url) updates.website_url = bioData.website_url
    if (bioData.positions) updates.positions = bioData.positions
    if (bioData.prior_office) updates.prior_office = bioData.prior_office

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('race_candidates')
        .update(updates)
        .eq('id', cand.id)

      if (!error) enriched++
      else console.error(`Failed to update ${cand.name}:`, error.message)
    }

    await sleep(500) // rate limiting
  }

  return enriched
}

// ─── CORE CANDIDATE PARSER ────────────────────────────────
// Ballotpedia's ACTUAL structure:
// <h3>District 1</h3>
// <h4>Democratic primary candidates</h4>
// <p>Wesley Bell (Incumbent)\nCori Bush\nCarl Harris Sr.</p>
//   OR as a list:
// <li>Wesley Bell (Incumbent)</li><li>Cori Bush</li>
//
// Key: candidates are in <p> or <li> tags after party headings

const parseCandidatesFromText = (
  html: string,
  baseOffice: string,
  stateCode: string,
  electionDate: string,
  year: number
): any[] => {
  const candidates: any[] = []

  // Extract the main content area
  const contentMatch = html.match(
    /div[^>]*class="[^"]*mw-parser-output[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*printfooter/
  ) || html.match(/div[^>]*class="[^"]*mw-parser-output[^"]*"[^>]*>([\s\S]*)/)

  const content = contentMatch ? contentMatch[1] : html

  // Split into sections by h2/h3/h4 headings
  const sections: Array<{ heading: string; body: string }> = []
  const parts = content.split(/(?=<h[234][^>]*>)/i)

  for (const part of parts) {
    const headingMatch = part.match(/<h[234][^>]*>(.*?)<\/h[234]>/i)
    if (!headingMatch) continue
    const heading = strip(headingMatch[1])
    sections.push({ heading, body: part })
  }

  let currentDistrict = ''
  let currentParty = ''

  for (const section of sections) {
    const h = section.heading.toLowerCase()

    // Detect district/race heading
    if (h.match(/district\s+\d+/i)) {
      currentDistrict = section.heading.trim()
      continue
    }

    // Detect party heading
    if (h.includes('democratic')) {
      currentParty = 'Democratic'
    } else if (h.includes('republican')) {
      currentParty = 'Republican'
    } else if (h.includes('libertarian')) {
      currentParty = 'Libertarian'
    } else if (h.includes('green party') || h.match(/^green\s/)) {
      currentParty = 'Green'
    } else if (h.includes('independent')) {
      currentParty = 'Independent'
    } else if (h.includes('nonpartisan') || h.includes('general election')) {
      currentParty = 'Nonpartisan'
    } else if (h.includes('minor party') || h.includes('third party')) {
      currentParty = 'Other'
      continue
    } else {
      continue
    }

    // Extract candidate names from <li> and <p> tags
    const nameMatches = [
      ...section.body.matchAll(/<li[^>]*>(.*?)<\/li>/gis),
      ...section.body.matchAll(/<p[^>]*>(.*?)<\/p>/gis),
    ]

    for (const match of nameMatches) {
      const rawText = strip(match[1])

      // Skip noise
      if (!rawText || rawText.length < 3) continue
      if (rawText.toLowerCase().includes('note:')) continue
      if (rawText.toLowerCase().includes('candidate list')) continue
      if (rawText.toLowerCase().includes('did not make')) continue
      if (rawText.toLowerCase().includes('click here')) continue
      if (rawText.toLowerCase().includes('see also')) continue
      if (rawText.length > 100) continue

      const lines = rawText
        .split(/\n|\r/)
        .map(l => l.trim())
        .filter(l => l.length > 2 && l.length < 60)

      for (let nameLine of lines) {
        const isIncumbent = nameLine.includes('(Incumbent)')
        nameLine = nameLine
          .replace(/\(Incumbent\)/gi, '')
          .replace(/\[.*?\]/g, '')
          .replace(/=\s*candidate.*$/i, '')
          .trim()

        if (!nameLine || nameLine.length < 3) continue
        if (nameLine.match(/^\d+$/)) continue
        if (nameLine.toLowerCase().match(/^(note|see|click|the|this|a |an |for |in )/)) continue

        const office = currentDistrict
          ? `${baseOffice} — ${currentDistrict}`
          : baseOffice

        candidates.push({
          name: nameLine,
          party: currentParty,
          party_color: partyColor(currentParty),
          office,
          office_level: getOfficeLevel(baseOffice),
          state_code: stateCode,
          election_name: `${STATE_NAMES[stateCode] || stateCode} ${baseOffice} ${year}`,
          election_date: electionDate,
          election_year: year,
          election_type: h.includes('general') ? 'general' : 'primary',
          incumbent: isIncumbent,
          ballotpedia_url: null,
        })
      }
    }
  }

  // Deduplicate by name + office
  const seen = new Set<string>()
  return candidates.filter(c => {
    const key = `${c.name}|${c.office}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── BALLOT MEASURE PARSER ────────────────────────────────
const parseBallotMeasures = (
  html: string,
  stateCode: string,
  year: number
): any[] => {
  const measures: any[] = []

  const measurePatterns = [
    /(?:Proposition|Amendment|Initiative|Measure|Question|Issue|Referendum|Ordinance)\s+([A-Z0-9\-]+)/gi,
    /(Constitutional Amendment(?:\s+\w+)?)/gi,
    /(State (?:Statute|Initiative) [A-Z0-9]+)/gi,
  ]

  const headings = html.matchAll(/<h[234][^>]*>(.*?)<\/h[234]>/gi)
  for (const match of headings) {
    const title = strip(match[1])
    if (!title || title.length < 5) continue

    const isMeasure = measurePatterns.some(p => {
      p.lastIndex = 0
      return p.test(title)
    })

    if (isMeasure || title.match(/^(Prop|Measure|Amendment|Initiative|Question)\s+/i)) {
      const pos = html.indexOf(match[0])
      const afterHeading = strip(html.slice(pos, pos + 800))
        .replace(title, '')
        .slice(0, 300)
        .trim()

      const urlMatch = match[1].match(/href="([^"]*ballotpedia[^"]*)"/) ||
        html.slice(pos, pos + 400).match(/href="([^"]*ballotpedia[^"]*)"/)

      measures.push({
        title,
        measure_number: title.match(/([A-Z]+\s+[A-Z0-9]+|[A-Z0-9]+)/)?.[0] || title,
        measure_type: getMeasureType(title),
        summary: afterHeading || null,
        state_code: stateCode,
        jurisdiction_level: 'state',
        election_year: year,
        election_date: `${year}-11-03`,
        ballotpedia_url: urlMatch
          ? (urlMatch[1].startsWith('http') ? urlMatch[1] : `https://ballotpedia.org${urlMatch[1]}`)
          : null,
      })
    }
  }

  return measures
}

// ─── OFFICIALS PARSER ─────────────────────────────────────
const parseOfficials = (
  html: string,
  stateCode: string,
  city: string
): any[] => {
  const officials: any[] = []

  const infoboxMatch = html.match(
    /<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i
  )

  if (infoboxMatch) {
    const infoHtml = infoboxMatch[1]
    const rows = infoHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)
    for (const row of rows) {
      const rowText = strip(row[1])
      const links = [...row[1].matchAll(/<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi)]

      if (rowText.match(/Mayor|Governor|Council|Senator|Representative|Attorney|Treasurer|Secretary/i)) {
        for (const link of links) {
          const href = link[1]
          const name = link[2].trim()

          if (name && name.length > 3 && !name.match(/^(See|Click|Learn|More|View)/i)) {
            const officeMatch = rowText.match(/(Mayor|Governor|City Council|State Senator|State Representative|Attorney General|Secretary of State|Treasurer)/i)

            officials.push({
              name,
              office: officeMatch ? officeMatch[1] : 'Elected Official',
              state_code: stateCode,
              city: city || null,
              ballotpedia_url: href.startsWith('http')
                ? href
                : `https://ballotpedia.org${href}`,
            })
          }
        }
      }
    }
  }

  const officeholderSection = html.match(
    /(?:current\s+office\s*holders?|elected\s+officials?)([\s\S]{0,2000})/i
  )
  if (officeholderSection) {
    const links = officeholderSection[1].matchAll(
      /<a[^>]*href="(\/[^"]+)"[^>]*>([^<]+)<\/a>/gi
    )
    for (const link of links) {
      const name = link[2].trim()
      if (name && name.length > 3 && !name.match(/^(See|District|Ward|Seat)/i)) {
        officials.push({
          name,
          office: 'Elected Official',
          state_code: stateCode,
          city: city || null,
          ballotpedia_url: `https://ballotpedia.org${link[1]}`,
        })
      }
    }
  }

  return officials
}

// ─── ELECTIONS EXTRACTOR ──────────────────────────────────
const parseElections = (
  html: string,
  stateCode: string,
  year: number
): any[] => {
  const elections: any[] = []

  const tableMatch = html.match(
    /<table[^>]*class="[^"]*marqueetable[^"]*"[^>]*>([\s\S]*?)<\/table>/i
  )

  if (!tableMatch) return elections

  const rows = tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
    if (cells.length < 3) continue

    const officeText = strip(cells[0][1])
    const hasElection = cells[1][1].includes('✓') || cells[1][1].includes('✓')
    const linkMatch = cells[2][1].match(/href="([^"]+)"/)

    if (hasElection && linkMatch && officeText) {
      const href = linkMatch[1]
      elections.push({
        election_name: officeText,
        election_date: `${year}-11-03`,
        election_type: 'general',
        state_code: stateCode,
        city: null,
        ballotpedia_url: href.startsWith('http')
          ? href
          : `https://ballotpedia.org${href}`,
        is_upcoming: new Date(`${year}-11-03`) > new Date(),
        election_year: year,
      })
    }
  }

  return elections
}

// ─── MAIN HANDLER ─────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    const stateName = STATE_NAMES[state_code] || state_code
    const results = {
      elections: 0,
      candidates: 0,
      measures: 0,
      officials: 0,
      enriched_bios: 0,
      errors: [] as string[],
    }

    // Log job
    await supabase.from('ballotpedia_scraper_log').insert({
      job_type: scrape_type,
      state_code,
      city,
      status: 'running',
    })

    // ── 1. ELECTIONS ──────────────────────────────────────
    if (['all', 'elections'].includes(scrape_type)) {
      const url = `https://ballotpedia.org/${stateName}_elections,_${year}`
      console.log('Scraping elections:', url)
      const html = await fetchPage(url)

      if (html) {
        const elections = parseElections(html, state_code, year)

        if (elections.length > 0) {
          await supabase
            .from('ballotpedia_elections')
            .delete()
            .eq('state_code', state_code)

          const { error } = await supabase
            .from('ballotpedia_elections')
            .insert(elections)

          if (!error) results.elections = elections.length
          else results.errors.push(`Elections: ${error.message}`)
        }
      }
      await sleep(600)
    }

    // ── 2. CANDIDATES ─────────────────────────────────────
    if (['all', 'candidates'].includes(scrape_type)) {
      const raceUrls = [
        {
          url: `https://ballotpedia.org/United_States_House_of_Representatives_elections_in_${stateName},_${year}`,
          office: 'U.S. House',
        },
        {
          url: `https://ballotpedia.org/${stateName}_State_Senate_elections,_${year}`,
          office: 'State Senate',
        },
        {
          url: `https://ballotpedia.org/${stateName}_State_House_of_Representatives_elections,_${year}`,
          office: 'State House',
        },
        {
          url: `https://ballotpedia.org/${stateName}_state_executive_official_elections,_${year}`,
          office: 'State Executive',
        },
      ]

      if (city) {
        const citySlug = city.replace(/\s+/g, '_')
        raceUrls.push({
          url: `https://ballotpedia.org/City_elections_in_${citySlug},_${stateName}_${year}`,
          office: `${city} Local`,
        })
        raceUrls.push({
          url: `https://ballotpedia.org/Mayoral_election_in_${citySlug},_${stateName}_(${year})`,
          office: `Mayor of ${city}`,
        })
      }

      const allCandidates: any[] = []

      for (const race of raceUrls) {
        console.log('Scraping candidates:', race.url)
        const html = await fetchPage(race.url)

        if (html) {
          const candidates = parseCandidatesFromText(
            html,
            race.office,
            state_code,
            `${year}-11-03`,
            year
          )
          console.log(`Found ${candidates.length} candidates for ${race.office}`)
          allCandidates.push(...candidates)
        }
        await sleep(600)
      }

      if (allCandidates.length > 0) {
        await supabase
          .from('ballotpedia_candidates')
          .delete()
          .eq('state_code', state_code)
          .eq('election_year', year)

        for (let i = 0; i < allCandidates.length; i += 50) {
          const batch = allCandidates.slice(i, i + 50)
          const { error } = await supabase
            .from('ballotpedia_candidates')
            .insert(batch)

          if (error) results.errors.push(`Candidates batch ${i}: ${error.message}`)
        }
        results.candidates = allCandidates.length
      }
    }

    // ── 3. BALLOT MEASURES ────────────────────────────────
    if (['all', 'measures'].includes(scrape_type)) {
      const measureUrls = [
        `https://ballotpedia.org/${stateName}_${year}_ballot_measures`,
        `https://ballotpedia.org/${stateName}_${year}_ballot_propositions`,
      ]

      for (const url of measureUrls) {
        console.log('Scraping measures:', url)
        const html = await fetchPage(url)
        if (!html) continue

        const measures = parseBallotMeasures(html, state_code, year)
        console.log(`Found ${measures.length} ballot measures`)

        if (measures.length > 0) {
          await supabase
            .from('ballotpedia_ballot_measures')
            .delete()
            .eq('state_code', state_code)
            .eq('election_year', year)

          const { error } = await supabase
            .from('ballotpedia_ballot_measures')
            .insert(measures)

          if (!error) results.measures = measures.length
          else results.errors.push(`Measures: ${error.message}`)
          break
        }
        await sleep(600)
      }
    }

    // ── 4. OFFICIALS ──────────────────────────────────────
    if (['all', 'officials'].includes(scrape_type) && city) {
      const citySlug = city.replace(/\s+/g, '_')
      const cityUrl = `https://ballotpedia.org/${citySlug},_${stateName}`
      console.log('Scraping officials:', cityUrl)

      const html = await fetchPage(cityUrl)
      if (html) {
        const officials = parseOfficials(html, state_code, city)
        console.log(`Found ${officials.length} officials`)

        if (officials.length > 0) {
          await supabase
            .from('ballotpedia_officials')
            .delete()
            .eq('state_code', state_code)
            .eq('city', city)

          const { error } = await supabase
            .from('ballotpedia_officials')
            .insert(officials)

          if (!error) results.officials = officials.length
          else results.errors.push(`Officials: ${error.message}`)
        }
      }
    }

    // Update log
    await supabase
      .from('ballotpedia_scraper_log')
      .update({
        status: results.errors.length === 0 ? 'success' : 'partial',
        records_scraped: results.candidates + results.measures + results.officials + results.elections,
        completed_at: new Date().toISOString(),
        error_message: results.errors.length > 0
          ? results.errors.join('; ')
          : null,
      })
      .eq('status', 'running')

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Scraper error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
