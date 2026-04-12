import { motion } from "framer-motion";
import logoSrc from "@/assets/uwazi-logo.png";

export function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 fixed inset-0 z-50"
    >
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-30 animate-pulse"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
            animationDuration: "2.5s",
            transform: "scale(1.5)",
          }}
        />
        <img
          src={logoSrc}
          alt="UWAZI"
          width={80}
          height={80}
          className="animate-spin relative z-10"
          style={{ animationDuration: "8s" }}
        />
      </div>
      <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
        Loading
      </p>
    </motion.div>
  );
}
