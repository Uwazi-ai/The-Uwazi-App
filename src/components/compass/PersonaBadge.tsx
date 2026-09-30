import { useEffect, useState } from "react";

/** Single line icon paths on a 24 by 24 grid, keyed by persona slug. */
export const PERSONA_PATHS: Record<string, string> = {
  watchdog: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M19 5l2-2",
  builder: "M3 21h18 M5 21V10h5v11 M10 21V6h5v15 M15 21V13h4v8 M7 7l3-3 4 2 3-3",
  guardian: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z M9 12l2 2 4-4",
  neighbor: "M3 11l9-7 9 7 M5 10v10h5v-6h4v6h5V10 M14 4h3v3",
  mentor: "M2 9l10-5 10 5-10 5-10-5z M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5 M22 9v6",
  caretaker: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z M9 11h2l1-2 2 4 1-2h2",
  connector: "M5 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M19 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M7 8h6a3 3 0 0 1 3 3v1a3 3 0 0 0 3 3 M5 10v4a3 3 0 0 0 3 3h1",
  organizer: "M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2 M16 3.5a3 3 0 0 1 0 5.5 M22 20v-2a4 4 0 0 0-3-3.9",
  steward: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7l2.5 4.5L12 17l-2.5-5.5L12 7z M12 3v2 M12 19v2 M3 12h2 M19 12h2",
};

const PERSONA_TOKEN: Record<string, string> = {
  watchdog: "primary", builder: "orange", guardian: "blue", neighbor: "coral", mentor: "purple",
  caretaker: "teal", connector: "sky", organizer: "gold", steward: "silver",
};

/** Resolve a theme token to a plain color so shared pictures keep the right colors. */
function tokenColor(name: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return v ? `hsl(${v})` : "currentColor";
}

function useColors(slug: string, locked: boolean) {
  const read = () => ({
    color: tokenColor(locked ? "muted-foreground" : `persona-${PERSONA_TOKEN[slug] ?? "silver"}`),
    bg: tokenColor("background"),
    card: tokenColor("card"),
  });
  const [c, setC] = useState(read);
  useEffect(() => {
    setC(read());
    const obs = new MutationObserver(() => setC(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, locked]);
  return c;
}

export type BadgeSize = "chip" | "card" | "medallion";
const PX: Record<BadgeSize, number> = { chip: 40, card: 64, medallion: 88 };

interface Props { slug: string; size?: BadgeSize; locked?: boolean; label?: string; className?: string }

export function PersonaBadge({ slug, size = "chip", locked = false, label, className }: Props) {
  const { color, bg } = useColors(slug, locked);
  const px = PX[size];
  const path = PERSONA_PATHS[slug] ?? PERSONA_PATHS.steward;
  const c = px / 2;
  const a11y = label ?? `${slug} badge${locked ? ", not earned yet" : ""}`;

  if (size === "medallion") {
    const icon = 34;
    const fid = `glow-${slug}`;
    return (
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} role="img" aria-label={a11y} className={className} data-testid="persona-medallion">
        <defs><filter id={fid} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6" /></filter></defs>
        {locked ? (
          <circle cx={c} cy={c} r={40} fill="none" stroke={color} strokeWidth={3} strokeDasharray="5 5" />
        ) : (
          <>
            <circle cx={c} cy={c} r={41.5} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={3} filter={`url(#${fid})`} />
            <circle cx={c} cy={c} r={38.5} fill="none" stroke={color} strokeWidth={3} />
          </>
        )}
        <circle cx={c} cy={c} r={35} fill="none" stroke={bg} strokeWidth={4} />
        <circle cx={c} cy={c} r={33} fill={color} fillOpacity={locked ? 0.06 : 0.12} />
        <circle cx={c} cy={c} r={25} fill={bg} />
        <g transform={`translate(${c - icon / 2} ${c - icon / 2}) scale(${icon / 24})`}>
          <path d={path} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    );
  }

  const ring = size === "chip" ? 2 : 2.5;
  const icon = size === "chip" ? 18 : 28;
  const sw = size === "chip" ? 2.2 : 2;
  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} role="img" aria-label={a11y} className={className} data-testid={`persona-${size}`}>
      <circle cx={c} cy={c} r={c - ring / 2 - 0.5} fill={color} fillOpacity={locked ? 0.06 : 0.14}
        stroke={color} strokeWidth={ring} strokeDasharray={locked ? "4 4" : undefined} />
      <g transform={`translate(${c - icon / 2} ${c - icon / 2}) scale(${icon / 24})`}>
        <path d={path} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
