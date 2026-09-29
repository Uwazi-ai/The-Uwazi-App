import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface Props { text: string; onAnswer: (v: number) => void }

// Swipe right to agree, left to disagree, tap for Not sure.
export function SwipeCard({ text, onAnswer }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const agreeOpacity = useTransform(x, [20, 120], [0, 1]);
  const disagreeOpacity = useTransform(x, [-120, -20], [1, 0]);

  useEffect(() => { x.set(0); }, [text, x]);

  const fling = (dir: 1 | -1, v: number) => {
    animate(x, dir * 500, { duration: 0.2 }).then(() => onAnswer(v));
  };

  return (
    <div className="relative h-[190px] select-none">
      <motion.div
        data-testid="swipe-card"
        role="button"
        tabIndex={0}
        aria-label={`${text}. Swipe right to agree, left to disagree, or tap for Not sure.`}
        className="absolute inset-0 bg-card rounded-2xl p-6 shadow-card border border-border flex items-center cursor-grab active:cursor-grabbing touch-none"
        style={{ x, rotate }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDragEnd={(_, info) => {
          if (info.offset.x > 110 || info.velocity.x > 600) fling(1, 4);
          else if (info.offset.x < -110 || info.velocity.x < -600) fling(-1, 2);
        }}
        onTap={(_, info) => { if (Math.abs(x.get()) < 5) onAnswer(3); void info; }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") fling(1, 4);
          if (e.key === "ArrowLeft") fling(-1, 2);
          if (e.key === "Enter" || e.key === " ") onAnswer(3);
        }}
      >
        <motion.span style={{ opacity: agreeOpacity }} className="absolute top-3 right-4 text-xs font-bold text-primary">AGREE</motion.span>
        <motion.span style={{ opacity: disagreeOpacity }} className="absolute top-3 left-4 text-xs font-bold text-destructive">DISAGREE</motion.span>
        <p className="text-xl font-semibold text-foreground leading-snug">{text}</p>
      </motion.div>
    </div>
  );
}
