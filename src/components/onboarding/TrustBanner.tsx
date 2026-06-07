import { Shield } from "lucide-react";
import { useInAppBrowser } from "@/contexts/InAppBrowserContext";

export function TrustBanner() {
  const { openInAppBrowser } = useInAppBrowser();
  return (
    <div
      className="flex items-center justify-center gap-2 flex-wrap text-center"
      style={{
        background: "rgba(155, 211, 75, 0.08)",
        borderTop: "1px solid rgba(155, 211, 75, 0.15)",
        borderRadius: "0 0 12px 12px",
        padding: "16px 24px",
      }}
    >
      <Shield size={16} color="#9BD34B" />
      <span
        style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          color: "#9BD34B",
        }}
      >
        Your data is never sold. Ever.
      </span>
      <span style={{ color: "#9BD34B", fontSize: 12 }}>·</span>
      <button
        type="button"
        onClick={() => openInAppBrowser("https://uwazi.ai/privacy")}
        style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 12,
          color: "#9BD34B",
          textDecoration: "none",
        }}
        className="hover:underline"
      >
        Privacy Policy
      </button>
    </div>
  );
}
