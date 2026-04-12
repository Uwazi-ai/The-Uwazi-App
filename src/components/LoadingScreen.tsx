import logoSrc from "@/assets/uwazi-logo.png";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <img
        src={logoSrc}
        alt="UWAZI"
        width={80}
        height={80}
        className="animate-spin"
        style={{ animationDuration: "3s" }}
      />
      <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
        Loading
      </p>
    </div>
  );
}
