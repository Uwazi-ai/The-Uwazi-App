import logoSrc from "@/assets/uwazi-logo.png";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
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
    </div>
  );
}
