import { supabase } from "@/integrations/supabase/client";

export interface VoterAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface VoterElection {
  id: string;
  name: string;
  date: string;
  electionDay: string;
  status: "active" | "expected";
  registrationDeadlines?: {
    online?: string | null;
    byMail?: string | null;
    inPerson?: string | null;
  };
  votingMethods?: {
    byMail?: boolean;
    earlyVoting?: { start?: string; end?: string } | null;
    inPerson?: boolean;
  };
  checkRegistrationUrl?: string;
  registrationUrl?: string;
  pollingLocationUrl?: string;
  pollingLocation?: {
    name?: string;
    address?: string;
    hours?: string;
    notes?: string;
  } | null;
  contests?: VoterContest[];
  ballotMeasures?: BallotMeasure[];
  coverage?: {
    hasLocalRaces?: boolean;
  };
}

export interface VoterContest {
  id?: string;
  name: string;
  level?: "federal" | "state" | "local";
  candidates?: {
    name: string;
    party?: string;
    incumbent?: boolean;
    websiteUrl?: string;
  }[];
}

export interface BallotMeasure {
  id?: string;
  name: string;
  summary?: string;
  type?: string;
}

export interface VoterElectionsData {
  elections: VoterElection[];
  source?: string;
  state?: string;
  zip?: string;
}

/**
 * Calls the get-voter-elections edge function to fetch personalized election data.
 * Saves the address + results to the user's profile.
 */
export async function fetchVoterElections(
  address: VoterAddress
): Promise<VoterElectionsData> {
  const { data, error } = await supabase.functions.invoke("get-voter-elections", {
    body: {
      street: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip,
    },
  });
  if (error) throw new Error(error.message || "Failed to fetch election data");
  return data as VoterElectionsData;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Reads cached election data from a profile object.
 * Returns { data, isFresh, hasAddress }.
 */
export function getVoterElectionsFromProfile(profile: any): {
  data: VoterElectionsData | null;
  isFresh: boolean;
  hasAddress: boolean;
} {
  const street = profile?.voter_address_street;
  const city = profile?.voter_address_city;
  const state = profile?.voter_address_state;
  const zip = profile?.voter_address_zip;
  const hasAddress = Boolean(street && city && state && zip);

  const cachedData = profile?.voter_elections_data as VoterElectionsData | null;
  const cachedAt = profile?.voter_elections_cached_at;

  let isFresh = false;
  if (cachedAt) {
    const age = Date.now() - new Date(cachedAt).getTime();
    isFresh = age < CACHE_TTL_MS;
  }

  return { data: cachedData || null, isFresh, hasAddress };
}
