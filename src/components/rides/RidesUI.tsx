import { ReactNode } from "react";

export function RidesShell({ logo, children }: { logo: string; children: ReactNode }) {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[hsl(var(--rides-bg))] text-[hsl(var(--rides-ink))]">
      <div className="mx-auto w-full max-w-[460px] px-5 pb-12 pt-[calc(var(--sat)+1.25rem)]">
        <header className="mb-6">
          <img src={logo} alt="UWAZI.APP" className="h-10 w-auto" />
        </header>
        {children}
      </div>
    </main>
  );
}

export function GreenButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl bg-[hsl(var(--rides-green))] py-3.5 font-semibold text-[hsl(var(--rides-bg))] transition disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function InfoPanel({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-[hsl(var(--rides-blue))] p-4 text-sm leading-relaxed">{children}</div>;
}

export function Chip({ children, active, disabled, onClick, small }: { children: ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-xl border text-left transition ${small ? "px-3 py-2 text-sm" : "p-3"} ${
        active
          ? "border-[hsl(var(--rides-green))] bg-[hsl(var(--rides-green)/0.15)]"
          : "border-[hsl(var(--rides-ink)/0.2)]"
      } disabled:opacity-35`}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between py-2">
      <span className="font-semibold">{label}</span>
      <span className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-[hsl(var(--rides-green))]" : "bg-[hsl(var(--rides-ink)/0.2)]"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-[hsl(var(--rides-ink))] transition-all ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

export function fmtDay(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function fmtHour(h: string) {
  const n = Number(h.slice(0, 2));
  return `${n % 12 || 12} ${n < 12 ? "AM" : "PM"}`;
}

export function phoneDigits(p?: string | null) {
  return (p ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
}

export function fmtPhone(p?: string | null) {
  const d = phoneDigits(p);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (p ?? "");
}

export function telHref(p?: string | null) {
  const d = phoneDigits(p);
  return d.length === 10 ? `tel:+1${d}` : `tel:${p ?? ""}`;
}
