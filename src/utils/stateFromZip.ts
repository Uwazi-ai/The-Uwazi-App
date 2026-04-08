// Client-side ZIP → state lookup (mirrors DB function)
export function getStateFromZip(zip: string): string {
  if (zip >= '35000' && zip <= '36999') return 'AL';
  if (zip >= '99500' && zip <= '99999') return 'AK';
  if (zip >= '85000' && zip <= '86999') return 'AZ';
  if (zip >= '71600' && zip <= '72999') return 'AR';
  if (zip >= '90000' && zip <= '96699') return 'CA';
  if (zip >= '80000' && zip <= '81999') return 'CO';
  if (zip >= '06000' && zip <= '06999') return 'CT';
  if (zip >= '19700' && zip <= '19999') return 'DE';
  if (zip >= '32000' && zip <= '34999') return 'FL';
  if (zip >= '30000' && zip <= '31999') return 'GA';
  if (zip >= '96700' && zip <= '96999') return 'HI';
  if (zip >= '83200' && zip <= '83999') return 'ID';
  if (zip >= '60000' && zip <= '62999') return 'IL';
  if (zip >= '46000' && zip <= '47999') return 'IN';
  if (zip >= '50000' && zip <= '52999') return 'IA';
  if (zip >= '66000' && zip <= '67999') return 'KS';
  if (zip >= '40000' && zip <= '42999') return 'KY';
  if (zip >= '70000' && zip <= '71499') return 'LA';
  if (zip >= '03900' && zip <= '04999') return 'ME';
  if (zip >= '20600' && zip <= '21999') return 'MD';
  if (zip >= '01000' && zip <= '02799') return 'MA';
  if (zip >= '48000' && zip <= '49999') return 'MI';
  if (zip >= '55000' && zip <= '56799') return 'MN';
  if (zip >= '38600' && zip <= '39999') return 'MS';
  if (zip >= '63000' && zip <= '65999') return 'MO';
  if (zip >= '59000' && zip <= '59999') return 'MT';
  if (zip >= '68000' && zip <= '69999') return 'NE';
  if (zip >= '88900' && zip <= '89999') return 'NV';
  if (zip >= '03000' && zip <= '03899') return 'NH';
  if (zip >= '07000' && zip <= '08999') return 'NJ';
  if (zip >= '87000' && zip <= '88499') return 'NM';
  if (zip >= '10000' && zip <= '14999') return 'NY';
  if (zip >= '27000' && zip <= '28999') return 'NC';
  if (zip >= '58000' && zip <= '58999') return 'ND';
  if (zip >= '43000' && zip <= '45999') return 'OH';
  if (zip >= '73000' && zip <= '74999') return 'OK';
  if (zip >= '97000' && zip <= '97999') return 'OR';
  if (zip >= '15000' && zip <= '19699') return 'PA';
  if (zip >= '02800' && zip <= '02999') return 'RI';
  if (zip >= '29000' && zip <= '29999') return 'SC';
  if (zip >= '57000' && zip <= '57999') return 'SD';
  if (zip >= '37000' && zip <= '38599') return 'TN';
  if (zip >= '75000' && zip <= '79999') return 'TX';
  if (zip >= '84000' && zip <= '84999') return 'UT';
  if (zip >= '05000' && zip <= '05999') return 'VT';
  if (zip >= '20100' && zip <= '20599') return 'VA';
  if (zip >= '98000' && zip <= '99499') return 'WA';
  if (zip >= '24700' && zip <= '26999') return 'WV';
  if (zip >= '53000' && zip <= '54999') return 'WI';
  if (zip >= '82000' && zip <= '83199') return 'WY';
  if (zip >= '20000' && zip <= '20099') return 'DC';
  return 'MO';
}

export const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

// Registration deadlines by state (weeks before election)
export const REGISTRATION_DEADLINES: Record<string, string> = {
  AL: '15 days before election', AK: '30 days before election', AZ: '29 days before election',
  AR: '30 days before election', CA: '15 days before election (same-day available)',
  CO: 'Same-day registration available', CT: '7 days before election (same-day available)',
  DE: '24 days before election', DC: 'Same-day registration available',
  FL: '29 days before election', GA: '29 days before election', HI: 'Same-day registration available',
  ID: 'Same-day registration available', IL: '28 days before election (same-day available)',
  IN: '29 days before election', IA: '10 days before election (same-day available)',
  KS: '21 days before election', KY: '29 days before election',
  LA: '30 days before election', ME: 'Same-day registration available',
  MD: '21 days before election (same-day available)', MA: '10 days before election',
  MI: 'Same-day registration available', MN: 'Same-day registration available',
  MS: '30 days before election', MO: '27 days before election',
  MT: '30 days before election (same-day available)', NE: '18 days before election',
  NV: 'Same-day registration available', NH: 'Same-day registration available',
  NJ: '21 days before election', NM: '28 days before election',
  NY: '25 days before election', NC: '25 days before election (same-day during early voting)',
  ND: 'No registration required', OH: '30 days before election',
  OK: '25 days before election', OR: '21 days before election',
  PA: '15 days before election', RI: '30 days before election',
  SC: '30 days before election', SD: '15 days before election',
  TN: '30 days before election', TX: '30 days before election',
  UT: 'Same-day registration available', VT: 'Same-day registration available',
  VA: '22 days before election', WA: 'Same-day registration available',
  WV: '21 days before election', WI: 'Same-day registration available',
  WY: 'Same-day registration available',
};
