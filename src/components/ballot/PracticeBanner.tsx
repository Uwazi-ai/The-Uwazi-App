export function PracticeBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border-2 border-amber-500/50 bg-amber-500/10 px-4 py-2.5 text-center ${className}`}
      role="note"
      aria-label="Practice ballot notice"
    >
      <div className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-amber-300">
        Unofficial · For Personal Use Only
      </div>
      <div className="mt-0.5 text-[11px] italic text-amber-200/80">
        Study guide — not an official ballot. Don't present at the polls.
      </div>
    </div>
  );
}
