export interface FeaturedBill {
  type: string;
  number: string;
  congress: string;
  title: string;
  latestAction: { text: string };
  updateDate: string;
  _category: string;
  _status: string;
  _jurisdiction?: string;
  _description?: string;
}

const twoHoursAgo = () => new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

export const FEATURED_BILLS_2025: FeaturedBill[] = [
  { type: "hr", number: "1", congress: "119", title: "One Big Beautiful Bill Act", latestAction: { text: "Referred to Ways and Means Committee" }, updateDate: twoHoursAgo(), _category: "Budget/Tax", _status: "In Committee", _description: "Comprehensive budget and tax reform legislation covering multiple areas of federal spending and revenue." },
  { type: "hr", number: "9747", congress: "119", title: "Continuing Appropriations Act 2026", latestAction: { text: "Signed into law by the President" }, updateDate: twoHoursAgo(), _category: "Budget", _status: "Signed", _description: "Provides continuing appropriations for federal agencies through fiscal year 2026, ensuring government operations continue without interruption." },
  { type: "s", number: "123", congress: "119", title: "Voting Rights Advancement Act", latestAction: { text: "Read twice and referred to the Committee on the Judiciary" }, updateDate: twoHoursAgo(), _category: "Voting Rights", _status: "In Committee", _description: "Restores and strengthens voting rights protections, updating the Voting Rights Act to address modern barriers to ballot access." },
  { type: "hr", number: "2471", congress: "119", title: "American Privacy Rights Act", latestAction: { text: "Passed the House of Representatives" }, updateDate: twoHoursAgo(), _category: "Rights", _status: "Passed House", _description: "Establishes comprehensive federal data privacy protections, giving Americans control over how their personal information is collected and used." },
  { type: "s", number: "456", congress: "119", title: "Farm Bill Reauthorization 2025", latestAction: { text: "Placed on Senate Legislative Calendar" }, updateDate: twoHoursAgo(), _category: "Agriculture", _status: "In Senate", _description: "Reauthorizes agricultural programs including SNAP nutrition assistance, crop insurance, conservation, and rural development funding." },
  { type: "hr", number: "5863", congress: "119", title: "AI Transparency Act", latestAction: { text: "Referred to the Committee on Energy and Commerce" }, updateDate: twoHoursAgo(), _category: "Technology", _status: "In Committee", _description: "Requires disclosure when AI systems are used in consumer-facing applications and establishes transparency standards for algorithmic decision-making." },
  { type: "hr", number: "3797", congress: "119", title: "Affordable Housing and Rental Protection Act", latestAction: { text: "Referred to the Committee on Financial Services" }, updateDate: twoHoursAgo(), _category: "Housing", _status: "In Committee", _description: "Addresses the affordable housing crisis by expanding rental assistance, protecting tenants from unfair evictions, and funding new affordable housing construction." },
  { type: "s", number: "789", congress: "119", title: "Student Loan Forgiveness Act", latestAction: { text: "Read twice and referred to the Committee on HELP" }, updateDate: twoHoursAgo(), _category: "Education", _status: "In Committee", _description: "Provides targeted student loan relief and reforms income-driven repayment plans to reduce the burden of higher education debt." },
  { type: "hr", number: "4521", congress: "119", title: "Clean Energy Tax Credits Extension", latestAction: { text: "Ordered to be reported by the Committee on Ways and Means" }, updateDate: twoHoursAgo(), _category: "Environment", _status: "Passed Committee", _description: "Extends and expands tax credits for renewable energy, electric vehicles, and energy-efficient home improvements through 2035." },
  { type: "s", number: "142", congress: "119", title: "Missouri Voting Access Act", latestAction: { text: "Referred to the Committee on Rules and Administration" }, updateDate: twoHoursAgo(), _category: "Voting Rights", _status: "In Committee", _jurisdiction: "State", _description: "Expands voting access in Missouri including early voting, automatic voter registration, and mail-in ballot protections." },
];

export function findFeaturedBill(congress: string, type: string, number: string): FeaturedBill | undefined {
  return FEATURED_BILLS_2025.find(
    b => b.congress === congress && b.type.toLowerCase() === type.toLowerCase() && b.number === number
  );
}
