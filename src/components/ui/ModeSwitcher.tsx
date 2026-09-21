"use client";

import { Compass, BrainCircuit } from "lucide-react";
import { usePalaceStore } from "@/store/usePalaceStore";

export default function ModeSwitcher() {
  const mode = usePalaceStore((s) => s.mode);
  const setMode = usePalaceStore((s) => s.setMode);
  const hasAnchors = usePalaceStore((s) =>
    s.anchors.some((anchor) => anchor.roomId === s.activeRoomId),
  );
  return (
    <div className="mode-switch" aria-label="Study mode">
      <button
        type="button"
        className={mode === "explore" ? "selected" : ""}
        aria-pressed={mode === "explore"}
        onClick={() => setMode("explore")}
      >
        <Compass size={16} /> Explore mode
      </button>
      <button
        type="button"
        className={mode === "recall" ? "selected" : ""}
        aria-pressed={mode === "recall"}
        onClick={() => setMode("recall")}
        disabled={!hasAnchors}
        title={
          hasAnchors
            ? "Practice recalling the anchors in this palace"
            : "Add a memory anchor to start a recall challenge"
        }
      >
        <BrainCircuit size={16} /> Recall challenge{" "}
        <span className="tiny-new">NEW</span>
      </button>
    </div>
  );
}
