import { useEffect, useRef, useState } from "react";
import { createSproutGame, type SproutGame as SproutGameHandle } from "@sprout/index";
import { makeSproutHost } from "@/lib/sproutHost";
import { GrownUpTools } from "./GrownUpTools";

interface Props { userId: string; onExit: () => void }

/** Mounts Phaser into a full-screen div and tears it down on unmount. */
export function SproutGame({ userId, onExit }: Props) {
  const mount = useRef<HTMLDivElement | null>(null);
  const handle = useRef<SproutGameHandle | null>(null);
  const [tools, setTools] = useState<"voice" | "photo" | null>(null);

  useEffect(() => {
    if (!mount.current) return;
    const host = makeSproutHost(userId, { openGrownUpTools: tab => setTools(tab), exit: onExit });
    const game = createSproutGame(mount.current, host);
    handle.current = game;
    return () => { handle.current = null; void game.destroy(); };
    // onExit is stable enough for the life of the route; re-creating Phaser on every render would be wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="fixed inset-0 bg-[#1F2A33]" style={{ touchAction: "none" }}>
      <div ref={mount} className="absolute inset-0" />
      {tools && <GrownUpTools userId={userId} tab={tools} onClose={() => { setTools(null); handle.current?.refreshVoices(); }} />}
    </div>
  );
}
