import { motion } from "framer-motion";
import pinwheel from "@/assets/uwazi-pinwheel.png";

export function LoadingScreen({ fullScreen = true, label = "Loading your space" }: { fullScreen?: boolean; label?: string }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      role="status"
      aria-label={label}
      className={`flex flex-col items-center justify-center bg-background gap-5 ${fullScreen ? "fixed inset-0 z-50 min-h-screen" : "min-h-[55vh] w-full"}`}
    >
      <img src={pinwheel} alt="" width={72} height={72} className="h-[72px] w-[72px] motion-safe:animate-spin motion-reduce:animate-none" style={{ animationDuration: "8s" }} />
      <p className="text-foreground font-heading text-xl">UWAZI</p>
      <p className="text-muted-foreground text-sm">{label}</p>
    </motion.div>
  );
}
