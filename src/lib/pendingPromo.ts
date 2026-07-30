const KEY = "uwazi.pendingPromo";

export interface PendingPromo {
  code: string;
  campaign?: string;
}

/** Persist a promo code across the sign-up / sign-in hop. */
export function savePendingPromo(promo: PendingPromo) {
  if (!promo.code) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(promo));
  } catch {
    /* storage unavailable — URL param is the fallback */
  }
}

export function readPendingPromo(): PendingPromo | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPromo;
    return parsed?.code ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingPromo() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

/** Where to send a user after auth: back to /redeem if a card code is waiting. */
export function promoReturnPath(fallback: string): string {
  const pending = readPendingPromo();
  if (!pending) return fallback;
  const params = new URLSearchParams({ code: pending.code });
  if (pending.campaign) params.set("c", pending.campaign);
  return `/redeem?${params.toString()}`;
}
