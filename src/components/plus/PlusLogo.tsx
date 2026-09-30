import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import fallbackDarkLogo from "@/assets/uwazi-plus-logo.png";
import { cn } from "@/lib/utils";

type BrandLogos = { dark: string; light: string };

const LOGO_BUCKET = "home-video-media";

function storagePath(value: string) {
  const marker = `/${LOGO_BUCKET}/`;
  const index = value.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(value.slice(index + marker.length).split("?")[0]);
}

async function displayUrl(value: string) {
  const path = storagePath(value);
  if (!path) return value;
  const { data, error } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

async function loadBrandLogos(): Promise<BrandLogos> {
  const { data, error } = await (supabase as any).rpc("get_plus_brand_logos");
  if (error) return { dark: fallbackDarkLogo, light: "" };
  const row = Array.isArray(data) ? data[0] : data;
  const [dark, light] = await Promise.all([
    row?.dark_url ? displayUrl(row.dark_url) : Promise.resolve(""),
    row?.light_url ? displayUrl(row.light_url) : Promise.resolve(""),
  ]);
  return { dark: dark || fallbackDarkLogo, light };
}

export function PlusLogo({
  on_dark,
  className,
}: {
  on_dark: boolean;
  className?: string;
}) {
  const { data } = useQuery({
    queryKey: ["plus-brand-logos"],
    queryFn: loadBrandLogos,
    staleTime: 5 * 60 * 1000,
  });
  const dark = data?.dark || fallbackDarkLogo;
  const requested = on_dark ? dark : data?.light;
  const source = requested || dark;
  const needsDarkSurface = on_dark || !requested;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1",
        needsDarkSurface ? "bg-plus-chip" : "bg-transparent",
      )}
      data-logo-surface={needsDarkSurface ? "dark" : "light"}
    >
      <img
        src={source}
        alt="UWAZI Plus"
        className={cn("h-7 w-auto max-w-full object-contain", className)}
        onError={(event) => {
          if (event.currentTarget.src !== fallbackDarkLogo) event.currentTarget.src = fallbackDarkLogo;
        }}
      />
    </span>
  );
}