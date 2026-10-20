export type TourStep = { href: string | null; title: string; body: string };

export const TOUR_STEPS: TourStep[] = [
  { href: null, title: "Welcome to UWAZI", body: "This quick tour shows you around. It takes about a minute. You can skip it any time." },
  { href: "/app", title: "Home", body: "Your daily start. See your points, your next step and what is new in your city." },
  { href: "/app/ask", title: "Ask UWAZI", body: "Ask any question about your government, your ballot or your city. Answers are factual and nonpartisan." },
  { href: "/app/vote", title: "Voting Hub", body: "Find your elections, candidates, ballot measures and voting plan in one place." },
  { href: "/app/learn", title: "Learn", body: "Short lessons on how government works. Pass a quiz to earn badges." },
  { href: "/app/watch", title: "Watch", body: "Short civic videos. Swipe up for the next one." },
  { href: null, title: "Need help later?", body: "Open Help in the menu for how-to guides. You can replay this tour there too." },
];

const key = (userId: string) => `uwazi:tour-done:${userId}`;
export const tourDone = (userId: string) => { try { return localStorage.getItem(key(userId)) === "1"; } catch { return true; } };
export const markTourDone = (userId: string) => { try { localStorage.setItem(key(userId), "1"); } catch { /* storage blocked */ } };
export const REPLAY_EVENT = "uwazi:replay-tour";
export const replayTour = () => window.dispatchEvent(new Event(REPLAY_EVENT));
