// Same rule lives in supabase/functions/ballot-lookup/index.ts. Keep both in sync.
export type BallotLinkKind = "sample_ballot" | "voter_lookup";
export type StateLinkFields = { sample_ballot_url?: string | null; check_url?: string | null; website_url?: string | null; phone?: string | null; phone_verified?: boolean | null } | null | undefined;

export function pickBallotLink(googleBallotUrl: string | null | undefined, l: StateLinkFields): { url: string | null; kind: BallotLinkKind | null } {
  if (googleBallotUrl) return { url: googleBallotUrl, kind: "sample_ballot" };
  if (l?.sample_ballot_url) return { url: l.sample_ballot_url, kind: "sample_ballot" };
  const url = l?.check_url || l?.website_url || null;
  return { url, kind: url ? "voter_lookup" : null };
}

/** State table phones show only after an admin checks them. Google local office phones always show. */
export function pickPhone(googlePhone: string | null | undefined, l: StateLinkFields): string | null {
  if (googlePhone) return googlePhone;
  return l?.phone_verified && l.phone ? l.phone : null;
}

export const BALLOT_LINK_LABEL: Record<BallotLinkKind, string> = {
  sample_ballot: "See your official sample ballot",
  voter_lookup: "Open your state's official voter lookup",
};
export const VOTER_LOOKUP_HELPER = "Look up your registration there to see your ballot.";
