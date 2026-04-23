import { useSignedAvatar } from "@/hooks/useSignedAvatar";

interface AdminAvatarProps {
  src: string | null | undefined;
  fallback: string;
  className?: string;
}

/** Resolves stored avatar value (path or URL) to a signed URL. Falls back to initial. */
export function AdminAvatar({ src, fallback, className = "h-full w-full object-cover" }: AdminAvatarProps) {
  const url = useSignedAvatar(src);
  if (url) return <img src={url} alt="" className={className} />;
  return <>{fallback}</>;
}
