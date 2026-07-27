export function PracticeBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-[10px] tracking-[0.18em] uppercase text-amber-300/90 text-center ${className}`}
      role="note"
      aria-label="Practice ballot notice"
    >
      Practice Ballot — Not an Official Ballot
    </div>
  );
}
