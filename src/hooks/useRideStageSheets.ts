import { useCallback, useEffect, useRef, useState } from 'react';
import { canShowStage, rideStage, type RiderCard } from '@/lib/rideExperience';
const fallback = new Set<string>();
export function useRideStageSheets(card: RiderCard | null, isCard: boolean) {
 const [sheet, setSheet] = useState<string | null>(null);
 const last = useRef('');
 const openOnce = useCallback((code: string, key: string) => {
  const storageKey = `uwazi:ride-sheet:${code}:${key}`;
  let seen = fallback.has(storageKey);
  try { seen = seen || localStorage.getItem(storageKey) === '1'; } catch { /* Storage may be unavailable. */ }
  if (seen) return;
  fallback.add(storageKey);
  try { localStorage.setItem(storageKey, '1'); } catch { /* In-memory fallback. */ }
  setSheet(key);
 }, []);
 useEffect(() => {
  if (!card) return;
  const stage = rideStage(card);
  const identity = `${card.ride_code}:${card.status}:${stage}`;
  if (last.current === identity) return;
  last.current = identity; setSheet(null);
  if (!canShowStage(card)) return;
  if (stage > 0) openOnce(card.ride_code, `stage-${stage}`);
  else if (isCard) openOnce(card.ride_code, 'booking-confirmed');
 }, [card, isCard, openOnce]);
 return { sheet, close: () => setSheet(null), quizFinished: () => { if (card && rideStage(card) < 4) openOnce(card.ride_code, 'quiz-finished'); } };
}
