export interface Representative {
  name: string;
  title: string;
  party: string | null;
  level: 'federal' | 'state' | 'local';
  level_order: number;
  party_color: string;
  phone?: string;
  website_url?: string;
  contact_form_url?: string;
  twitter?: string;
  office_address?: string;
  bioguide_id?: string;
  photo_url?: string | null;
  district?: string;
  data_source: string;
}

export const FEDERAL_REPS: Record<string, Representative[]> = {
  MO: [
    {
      name: 'Donald J. Trump',
      title: 'President of the United States',
      party: 'Republican',
      level: 'federal',
      level_order: 1,
      party_color: '#dc2626',
      phone: '202-456-1111',
      website_url: 'https://www.whitehouse.gov',
      contact_form_url: 'https://www.whitehouse.gov/contact/',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/220px-Donald_Trump_official_portrait.jpg',
      district: 'United States',
      data_source: 'hardcoded',
    },
    {
      name: 'JD Vance',
      title: 'Vice President of the United States',
      party: 'Republican',
      level: 'federal',
      level_order: 1,
      party_color: '#dc2626',
      phone: '202-456-1111',
      website_url: 'https://www.whitehouse.gov/administration/vice-president/',
      contact_form_url: 'https://www.whitehouse.gov/contact/',
      bioguide_id: 'V000137',
      photo_url: 'https://unitedstates.github.io/images/congress/225x275/V000137.jpg',
      district: 'United States',
      data_source: 'hardcoded',
    },
    {
      name: 'Josh Hawley',
      title: 'U.S. Senator',
      party: 'Republican',
      level: 'federal',
      level_order: 2,
      party_color: '#dc2626',
      phone: '202-224-6154',
      website_url: 'https://www.hawley.senate.gov',
      contact_form_url: 'https://www.hawley.senate.gov/contact-senator-hawley/',
      twitter: 'SenHawleyPress',
      bioguide_id: 'H001089',
      photo_url: 'https://unitedstates.github.io/images/congress/225x275/H001089.jpg',
      district: 'Missouri',
      data_source: 'hardcoded',
    },
    {
      name: 'Eric Schmitt',
      title: 'U.S. Senator',
      party: 'Republican',
      level: 'federal',
      level_order: 2,
      party_color: '#dc2626',
      phone: '202-224-5721',
      website_url: 'https://www.schmitt.senate.gov',
      contact_form_url: 'https://www.schmitt.senate.gov/connect/email',
      twitter: 'SenEricSchmitt',
      bioguide_id: 'S001226',
      photo_url: 'https://unitedstates.github.io/images/congress/225x275/S001226.jpg',
      district: 'Missouri',
      data_source: 'hardcoded',
    },
  ],
};

export const HOUSE_REPS: Record<string, Record<number, Representative>> = {
  MO: {
    1: {
      name: 'Wesley Bell', title: 'U.S. Representative', party: 'Democratic', level: 'federal', level_order: 3,
      party_color: '#1d4ed8', phone: '202-225-2406', website_url: 'https://wesleybell.house.gov',
      contact_form_url: 'https://wesleybell.house.gov/contact', bioguide_id: 'B001316',
      photo_url: 'https://unitedstates.github.io/images/congress/225x275/B001316.jpg',
      district: "Missouri's 1st Congressional District", data_source: 'hardcoded',
    },
    2: {
      name: 'Ann Wagner', title: 'U.S. Representative', party: 'Republican', level: 'federal', level_order: 3,
      party_color: '#dc2626', phone: '202-225-1621', website_url: 'https://wagner.house.gov',
      contact_form_url: 'https://wagner.house.gov/contact', twitter: 'RepAnnWagner', bioguide_id: 'W000812',
      photo_url: 'https://unitedstates.github.io/images/congress/225x275/W000812.jpg',
      district: "Missouri's 2nd Congressional District", data_source: 'hardcoded',
    },
    3: {
      name: 'Bob Onder', title: 'U.S. Representative', party: 'Republican', level: 'federal', level_order: 3,
      party_color: '#dc2626', phone: '202-225-2561', website_url: 'https://onder.house.gov',
      contact_form_url: 'https://onder.house.gov/contact', bioguide_id: 'O000175',
      photo_url: 'https://unitedstates.github.io/images/congress/225x275/O000175.jpg',
      district: "Missouri's 3rd Congressional District", data_source: 'hardcoded',
    },
    4: {
      name: 'Mark Alford', title: 'U.S. Representative', party: 'Republican', level: 'federal', level_order: 3,
      party_color: '#dc2626', phone: '202-225-2876', website_url: 'https://alford.house.gov',
      contact_form_url: 'https://alford.house.gov/contact', bioguide_id: 'A000378',
      photo_url: 'https://unitedstates.github.io/images/congress/225x275/A000378.jpg',
      district: "Missouri's 4th Congressional District", data_source: 'hardcoded',
    },
    5: {
      name: 'Emanuel Cleaver', title: 'U.S. Representative', party: 'Democratic', level: 'federal', level_order: 3,
      party_color: '#1d4ed8', phone: '202-225-4535', website_url: 'https://cleaver.house.gov',
      contact_form_url: 'https://cleaver.house.gov/contact-me', twitter: 'repcleaver', bioguide_id: 'C001061',
      photo_url: 'https://unitedstates.github.io/images/congress/225x275/C001061.jpg',
      district: "Missouri's 5th Congressional District (Kansas City)", data_source: 'hardcoded',
    },
    6: {
      name: 'Sam Graves', title: 'U.S. Representative', party: 'Republican', level: 'federal', level_order: 3,
      party_color: '#dc2626', phone: '202-225-7041', website_url: 'https://graves.house.gov',
      contact_form_url: 'https://graves.house.gov/contact', bioguide_id: 'G000546',
      photo_url: 'https://unitedstates.github.io/images/congress/225x275/G000546.jpg',
      district: "Missouri's 6th Congressional District", data_source: 'hardcoded',
    },
    7: {
      name: 'Eric Burlison', title: 'U.S. Representative', party: 'Republican', level: 'federal', level_order: 3,
      party_color: '#dc2626', phone: '202-225-6536', website_url: 'https://burlison.house.gov',
      contact_form_url: 'https://burlison.house.gov/contact', bioguide_id: 'B001326',
      photo_url: 'https://unitedstates.github.io/images/congress/225x275/B001326.jpg',
      district: "Missouri's 7th Congressional District", data_source: 'hardcoded',
    },
    8: {
      name: 'Jason Smith', title: 'U.S. Representative', party: 'Republican', level: 'federal', level_order: 3,
      party_color: '#dc2626', phone: '202-225-4404', website_url: 'https://jasonsmith.house.gov',
      contact_form_url: 'https://jasonsmith.house.gov/contact', bioguide_id: 'S001195',
      photo_url: 'https://unitedstates.github.io/images/congress/225x275/S001195.jpg',
      district: "Missouri's 8th Congressional District", data_source: 'hardcoded',
    },
  },
};

export const STATE_REPS: Record<string, Representative[]> = {
  MO: [
    {
      name: 'Mike Kehoe', title: 'Governor', party: 'Republican', level: 'state', level_order: 4,
      party_color: '#dc2626', phone: '573-751-3222', website_url: 'https://governor.mo.gov',
      contact_form_url: 'https://governor.mo.gov/contact-governor', twitter: 'GovMikeKehoe',
      office_address: 'Missouri State Capitol, Room 216, Jefferson City, MO 65101',
      photo_url: null, district: 'Missouri', data_source: 'hardcoded',
    },
    {
      name: 'David Wasinger', title: 'Lieutenant Governor', party: 'Republican', level: 'state', level_order: 5,
      party_color: '#dc2626', phone: '573-751-4727', website_url: 'https://ltgov.mo.gov',
      office_address: 'Missouri State Capitol, Room 224, Jefferson City, MO 65101',
      photo_url: null, district: 'Missouri', data_source: 'hardcoded',
    },
    {
      name: 'Andrew Bailey', title: 'Attorney General', party: 'Republican', level: 'state', level_order: 6,
      party_color: '#dc2626', phone: '573-751-3321', website_url: 'https://ago.mo.gov',
      contact_form_url: 'https://ago.mo.gov/contact-us',
      photo_url: null, district: 'Missouri', data_source: 'hardcoded',
    },
    {
      name: 'Vivek Malek', title: 'State Treasurer', party: 'Republican', level: 'state', level_order: 7,
      party_color: '#dc2626', phone: '573-751-8533', website_url: 'https://treasurer.mo.gov',
      photo_url: null, district: 'Missouri', data_source: 'hardcoded',
    },
    {
      name: 'Jay Ashcroft', title: 'Secretary of State', party: 'Republican', level: 'state', level_order: 8,
      party_color: '#dc2626', phone: '573-751-4936', website_url: 'https://www.sos.mo.gov',
      photo_url: null, district: 'Missouri', data_source: 'hardcoded',
    },
  ],
};

export const LOCAL_REPS: Record<string, Representative[]> = {
  'Kansas City': [
    {
      name: 'Quinton Lucas', title: 'Mayor', party: 'Democratic', level: 'local', level_order: 10,
      party_color: '#1d4ed8', phone: '816-513-3500', website_url: 'https://www.kcmo.gov/city-hall/departments/mayor',
      contact_form_url: 'https://www.kcmo.gov/city-hall/departments/mayor/contact-the-mayor', twitter: 'QuintonLucasKC',
      office_address: 'City Hall, 414 E 12th St, Kansas City, MO 64106',
      photo_url: null, district: 'Kansas City, Missouri', data_source: 'hardcoded',
    },
    {
      name: 'KCMO City Council', title: 'City Council', party: null, level: 'local', level_order: 11,
      party_color: '#6b7280', phone: '816-513-1368', website_url: 'https://www.kcmo.gov/city-hall/city-council',
      photo_url: null, district: 'Kansas City, Missouri', data_source: 'hardcoded',
    },
  ],
};

/** Get the congressional district number from a ZIP code (MO-specific) */
export function getDistrictFromZip(zip?: string | null): number | null {
  if (!zip) return null;
  const zipNum = parseInt(zip, 10);
  // Rough MO district mapping by ZIP prefix
  if (zipNum >= 63100 && zipNum <= 63199) return 1; // St. Louis city
  if (zipNum >= 63000 && zipNum <= 63099) return 2; // St. Louis county
  if (zipNum >= 63300 && zipNum <= 63399) return 3; // Central MO
  if (zipNum >= 64700 && zipNum <= 64899) return 4; // West central
  if (zipNum >= 64100 && zipNum <= 64199) return 5; // Kansas City
  if (zipNum >= 64400 && zipNum <= 64699) return 6; // Northwest
  if (zipNum >= 65600 && zipNum <= 65899) return 7; // Southwest
  if (zipNum >= 63600 && zipNum <= 63999) return 8; // Southeast
  // Default KC area
  if (zip.startsWith('641')) return 5;
  return 5;
}

export function getRepresentativesForUser(
  stateCode?: string | null,
  zipCode?: string | null,
  city?: string | null,
): Representative[] {
  const state = stateCode || 'MO';
  const reps: Representative[] = [];

  // Federal (President, VP, Senators)
  const federal = FEDERAL_REPS[state];
  if (federal) reps.push(...federal);

  // House rep for their district
  const district = getDistrictFromZip(zipCode);
  const houseReps = HOUSE_REPS[state];
  if (houseReps && district && houseReps[district]) {
    reps.push(houseReps[district]);
  }

  // State officials
  const stateReps = STATE_REPS[state];
  if (stateReps) reps.push(...stateReps);

  // Local officials
  const cityName = city || 'Kansas City';
  const local = LOCAL_REPS[cityName];
  if (local) reps.push(...local);

  return reps.sort((a, b) => a.level_order - b.level_order);
}
