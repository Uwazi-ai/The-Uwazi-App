import { motion } from "framer-motion";
import { DIM_ORDER } from "@/lib/compassDims";

interface Props {
  scores: Record<string, number>; // 0 to 1 per dimension slug
  needle?: string | null;
  size?: number;
  showIcons?: boolean;
  highlight?: string[];
}

const MIN = 0.12;

export function CompassRose({ scores, needle, size = 220, showIcons = true, highlight }: Props) {
  const c = size / 2;
  const R = size * 0.34;
  const iconR = size * 0.44;
  const step = (Math.PI * 2) / DIM_ORDER.length;
  const angle = (i: number) => -Math.PI / 2 + i * step;
  const pt = (i: number, r: number) => [c + Math.cos(angle(i)) * r, c + Math.sin(angle(i)) * r];

  const shape = DIM_ORDER.map((d, i) => {
    const v = Math.max(MIN, Math.min(1, scores[d.slug] ?? MIN));
    const [x, y] = pt(i, R * v);
    return `${x},${y}`;
  }).join(" ");

  const needleIdx = needle ? DIM_ORDER.findIndex((d) => d.slug === needle) : -1;
  const needleDeg = needleIdx >= 0 ? needleIdx * 45 : 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Your compass shape">
      {[0.33, 0.66, 1].map((r) => (
        <circle key={r} cx={c} cy={c} r={R * r} fill="none" stroke="hsl(var(--border))" strokeWidth={1} />
      ))}
      {DIM_ORDER.map((d, i) => {
        const [x, y] = pt(i, R);
        return <line key={d.slug} x1={c} y1={c} x2={x} y2={y} stroke="hsl(var(--border))" strokeWidth={1} />;
      })}
      <motion.polygon
        points={shape}
        animate={{ points: shape }}
        transition={{ type: "spring", stiffness: 120, damping: 16 }}
        fill="hsl(var(--primary) / 0.22)"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {DIM_ORDER.map((d, i) => {
        const v = Math.max(MIN, Math.min(1, scores[d.slug] ?? MIN));
        const [x, y] = pt(i, R * v);
        return (
          <motion.circle key={d.slug} animate={{ cx: x, cy: y, r: needle === d.slug ? 6 : 4 }}
            transition={{ type: "spring", stiffness: 140, damping: 14 }} fill={d.color} />
        );
      })}
      {needleIdx >= 0 && (
        <motion.g style={{ originX: `${c}px`, originY: `${c}px` }} initial={false} animate={{ rotate: needleDeg }}
          transition={{ type: "spring", stiffness: 90, damping: 12 }}>
          <polygon points={`${c - 4},${c} ${c + 4},${c} ${c},${c - R * 0.92}`} fill={DIM_ORDER[needleIdx].color} />
        </motion.g>
      )}
      <circle cx={c} cy={c} r={5} fill="hsl(var(--foreground))" />
      {showIcons && DIM_ORDER.map((d, i) => {
        const [x, y] = pt(i, iconR);
        const s = size * 0.075;
        const on = !highlight || highlight.includes(d.slug);
        return (
          <g key={d.slug} transform={`translate(${x - s / 2},${y - s / 2})`} opacity={on ? 1 : 0.35}>
            <d.Icon width={s} height={s} color={d.color} strokeWidth={2.2} />
          </g>
        );
      })}
    </svg>
  );
}
