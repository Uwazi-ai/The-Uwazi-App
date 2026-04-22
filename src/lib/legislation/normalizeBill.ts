export type NormalizedBill = {
  id: string;
  congress: string;
  billType: string;
  billNumber: string;
  jurisdiction: 'federal' | 'state';
  source: 'congress' | 'legiscan' | 'unknown';
  number: string;
  title: string;
  status?: string;
  lastAction?: string;
  lastActionDate?: string;
  sponsor?: { name: string; party?: string; state?: string };
  chamber?: 'house' | 'senate';
  fullText?: string;
  url?: string;
  subjects?: string[];
  introducedDate?: string;
};

function formatType(t: string) {
  const u = t.toUpperCase();
  if (u === 'HR') return 'H.R.';
  if (u === 'HJRES') return 'H.J.Res.';
  if (u === 'SJRES') return 'S.J.Res.';
  if (u === 'HCONRES') return 'H.Con.Res.';
  if (u === 'SCONRES') return 'S.Con.Res.';
  if (u === 'HRES') return 'H.Res.';
  if (u === 'SRES') return 'S.Res.';
  if (u === 'S') return 'S.';
  return u;
}

export function normalizeCongressBill(
  raw: any,
  congress: string,
  billType: string,
  billNumber: string
): NormalizedBill {
  const bill = raw?.bill ?? raw ?? {};
  return {
    id: `${congress}-${billType}-${billNumber}`,
    congress,
    billType,
    billNumber,
    jurisdiction: 'federal',
    source: 'congress',
    number: `${formatType(billType)} ${billNumber}`,
    title: bill.title ?? bill.shortTitle ?? 'Untitled bill',
    status: bill.latestAction?.text,
    lastAction: bill.latestAction?.text,
    lastActionDate: bill.latestAction?.actionDate,
    sponsor: bill.sponsors?.[0]
      ? {
          name: bill.sponsors[0].fullName ?? bill.sponsors[0].name,
          party: bill.sponsors[0].party,
          state: bill.sponsors[0].state,
        }
      : undefined,
    chamber:
      (bill.originChamber ?? '').toLowerCase() === 'house' ? 'house' : 'senate',
    fullText: bill.summary?.text ?? bill.title,
    url: bill.url,
    subjects: bill.subjects?.legislativeSubjects?.map((s: any) => s.name) ?? [],
    introducedDate: bill.introducedDate,
  };
}
