export type PollSite = {
  precinct_key: string;
  name: string;
  address: string;
  room: string | null;
  hours: string | null;
};

export function selectPollingSite(sites: PollSite[], key: string | null) {
  return key ? sites.find(site => site.precinct_key === key) ?? null : null;
}

export function filterPollingSites(sites: PollSite[], search: string, ward: string) {
  const term = search.trim().toLowerCase();
  return sites.filter(site => (!ward || site.precinct_key.split("-")[0] === ward)
    && (!term || `${site.precinct_key} ${site.name} ${site.address}`.toLowerCase().includes(term)));
}

export function pollingPlaceCount(sites: PollSite[]) {
  return new Set(sites.map(site => `${site.name}|${site.address}`)).size;
}