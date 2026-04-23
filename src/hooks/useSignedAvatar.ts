import { useEffect, useState } from "react";
import { resolveAvatarUrl } from "@/lib/avatar";

/** Resolve a stored avatar value to a usable (signed) URL. */
export function useSignedAvatar(stored: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!stored) {
      setUrl(null);
      return;
    }
    resolveAvatarUrl(stored).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [stored]);

  return url;
}
