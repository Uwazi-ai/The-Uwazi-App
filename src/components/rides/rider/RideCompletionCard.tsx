import { Check } from 'lucide-react';
import logo from '@/assets/uwazi-app-wordmark.png';
export function RideCompletionCard() { return <div className="rider-share-card space-y-5 rounded-lg p-6"><img src={logo} alt="UWAZI" className="h-8 w-auto" /><Check className="size-10" /><p className="font-heading text-3xl leading-tight">I rode to the polls with UWAZI</p><p className="text-sm">Free rides. A stronger community.</p><p className="font-semibold">(816) 379-6885</p></div>; }
