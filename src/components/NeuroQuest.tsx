"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Box,
  BrainCircuit,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Compass,
  Diamond,
  Expand,
  Focus,
  Keyboard,
  Layers3,
  Lightbulb,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { usePalaceStore } from "@/store/usePalaceStore";
import type { MemoryAnchor } from "@/lib/types";
import Navigation, { type WorkspacePage } from "./ui/Navigation";
import ModeSwitcher from "./ui/ModeSwitcher";
import AnchorDrawer from "./ui/AnchorDrawer";
import AddAnchorModal from "./ui/AddAnchorModal";
import AddRoomModal from "./ui/AddRoomModal";
import RoomIcon from "./ui/RoomIcon";

const Scene = dynamic(() => import("./three/Scene"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading">
      <Box size={34} />
      <span>
        Making room for your ideas<span className="loading-dots">...</span>
      </span>
    </div>
  ),
});

function AnchorSymbol({
  anchor,
  small = false,
}: {
  anchor: MemoryAnchor;
  small?: boolean;
}) {
  return (
    <span
      className={`anchor-symbol shape-${anchor.shape} ${small ? "small" : ""}`}
      style={{ "--anchor-color": anchor.color } as React.CSSProperties}
    >
      <span />
    </span>
  );
}

function MiniMap({ anchors }: { anchors: MemoryAnchor[] }) {
  const selected = usePalaceStore((s) => s.selectedAnchorId);
  const select = usePalaceStore((s) => s.selectAnchor);
  const mode = usePalaceStore((s) => s.mode);
  return (
    <div className="mini-map">
      <span>SPATIAL MAP</span>
      <svg viewBox="0 0 130 90" aria-label="Map of anchors in your palace">
        <path
          d="M65 8 118 33 65 79 12 54Z"
          fill="#b8a0ef0b"
          stroke="#b8a0ef44"
        />
        <path
          d="m39 21 53 46M91 21 39 67M13 54h105M65 8v71"
          stroke="#b8a0ef1f"
          fill="none"
        />
        {anchors.map((a, index) => (
          <g
            key={a.id}
            role="button"
            tabIndex={0}
            aria-label={
              mode === "recall"
                ? `Focus mystery anchor ${index + 1}`
                : `Focus ${a.title}`
            }
            onClick={() => select(a.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                select(a.id);
              }
            }}
          >
            <circle
              cx={65 + a.position[0] * 6 + a.position[2] * 3}
              cy={43 + a.position[2] * 3 - a.position[0] * 2}
              r="9"
              fill="transparent"
            />
            <circle
              cx={65 + a.position[0] * 6 + a.position[2] * 3}
              cy={43 + a.position[2] * 3 - a.position[0] * 2}
              r={selected === a.id ? 4.5 : 3}
              fill={a.color}
              stroke={selected === a.id ? "#fff" : "none"}
            />
          </g>
        ))}
      </svg>
      <span className="map-north">N ↑</span>
    </div>
  );
}

function AnchorList({ anchors }: { anchors: MemoryAnchor[] }) {
  const mode = usePalaceStore((s) => s.mode);
  const selected = usePalaceStore((s) => s.selectedAnchorId);
  const select = usePalaceStore((s) => s.selectAnchor);
  const setAddOpen = usePalaceStore((s) => s.setAddOpen);
  const mastered = anchors.filter((a) => a.status === "mastered").length;
  return (
    <aside className="anchor-list-panel">
      <div className="panel-eyebrow">
        <span>IN THIS PALACE</span>
        <Layers3 size={15} />
      </div>
      <div className="panel-heading">
        <h2>Your memory anchors</h2>
        <span>{String(anchors.length).padStart(2, "0")}</span>
      </div>
      <p className="panel-description">
        Every object holds a little knowledge.
      </p>
      <div className="anchor-list">
        {anchors.length === 0 && (
          <div className="empty-palace">
            <Box size={27} />
            <strong>Your next idea belongs here.</strong>
            <p>Add your first memory anchor to bring this palace to life.</p>
          </div>
        )}
        {anchors.map((a, index) => (
          <button
            className={`anchor-row ${selected === a.id ? "anchor-row-active" : ""}`}
            key={a.id}
            onClick={() => select(a.id)}
          >
            <AnchorSymbol anchor={a} />
            <span className="anchor-row-copy">
              <strong>
                {mode === "recall"
                  ? `Mystery anchor ${String(index + 1).padStart(2, "0")}`
                  : a.title}
              </strong>
              <small>
                {mode === "recall"
                  ? "Find the idea behind the object"
                  : a.category}
              </small>
            </span>
            <span
              className={`retention-dot ${a.status}`}
              title={a.status}
              aria-label={a.status}
            />
          </button>
        ))}
      </div>
      <button className="add-anchor-inline" onClick={() => setAddOpen(true)}>
        <Plus size={15} /> Place a new memory
      </button>
      <div className="mastery-card">
        <div>
          <span>
            <span className="mastery-star">✧</span> Making it stick
          </span>
          <strong>
            {anchors.length ? Math.round((mastered / anchors.length) * 100) : 0}
            %
          </strong>
        </div>
        <div className="progress-track">
          <div
            style={{
              width: `${anchors.length ? (mastered / anchors.length) * 100 : 0}%`,
            }}
          />
        </div>
        <p>
          <span>
            {mastered} of {anchors.length} anchors mastered
          </span>
          <CheckCheck size={13} />
        </p>
      </div>
      <div className="status-legend">
        <span>
          <i className="mastered" /> Mastered
        </span>
        <span>
          <i className="learning" /> Learning
        </span>
        <span>
          <i className="new" /> New
        </span>
      </div>
    </aside>
  );
}

function AmbientSound() {
  const enabled = usePalaceStore((s) => s.soundEnabled);
  useEffect(() => {
    if (!enabled) return;
    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = 0.013;
    gain.connect(context.destination);
    const oscillators = [130.81, 196, 261.63].map((frequency) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start();
      return oscillator;
    });
    void context.resume();
    const resume = () => {
      void context.resume();
    };
    window.addEventListener("pointerdown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      oscillators.forEach((o) => {
        o.stop();
        o.disconnect();
      });
      gain.disconnect();
      void context.close();
    };
  }, [enabled]);
  return null;
}

function WorkspaceDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="workspace-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="workspace-dialog-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function SearchDialog({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: () => void;
}) {
  const [query, setQuery] = useState("");
  const anchors = usePalaceStore((s) => s.anchors);
  const rooms = usePalaceStore((s) => s.rooms);
  const setRoom = usePalaceStore((s) => s.setRoom);
  const select = usePalaceStore((s) => s.selectAnchor);
  const mode = usePalaceStore((s) => s.mode);
  const matches = useMemo(
    () =>
      anchors
        .filter((a) =>
          `${a.title} ${a.content} ${a.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 15),
    [anchors, query],
  );
  return (
    <WorkspaceDialog title="Find a thought" onClose={onClose}>
      <label className="search-field">
        <Search size={19} />
        <input
          autoFocus
          placeholder="Search concepts, notes, and ideas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search memory anchors"
        />
        <kbd>ESC</kbd>
      </label>
      <div className="search-results">
        {mode === "recall" ? (
          <p className="empty-state">
            Finish your recall challenge to search your notes. You’ve got this.
          </p>
        ) : matches.length ? (
          matches.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setRoom(a.roomId);
                select(a.id);
                onNavigate();
                onClose();
              }}
            >
              <AnchorSymbol anchor={a} small />
              <span>
                <strong>{a.title}</strong>
                <small>
                  {rooms.find((r) => r.id === a.roomId)?.name} · {a.category}
                </small>
              </span>
              <ArrowUpRight size={17} />
            </button>
          ))
        ) : (
          <p className="empty-state">No anchors found. Try another idea.</p>
        )}
      </div>
    </WorkspaceDialog>
  );
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const effects = usePalaceStore((s) => s.effectsEnabled);
  const toggleEffects = usePalaceStore((s) => s.toggleEffects);
  const sound = usePalaceStore((s) => s.soundEnabled);
  const toggleSound = usePalaceStore((s) => s.toggleSound);
  const exportPalace = () => {
    const { anchors, rooms } = usePalaceStore.getState();
    const blob = new Blob(
      [
        JSON.stringify(
          {
            application: "NeuroQuest",
            version: 1,
            exportedAt: new Date().toISOString(),
            rooms,
            anchors,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neuroquest-memory-palaces.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <WorkspaceDialog title="Make this space yours" onClose={onClose}>
      <p className="dialog-intro">Little adjustments for a better headspace.</p>
      <div className="setting-row">
        <span>
          <Sparkles size={20} />
          <span>
            <strong>Atmospheric effects</strong>
            <small>Soft bloom and a cinematic vignette</small>
          </span>
        </span>
        <button
          className={`toggle ${effects ? "on" : ""}`}
          role="switch"
          aria-checked={effects}
          aria-label="Atmospheric effects"
          onClick={toggleEffects}
        >
          <span />
        </button>
      </div>
      <div className="setting-row">
        <span>
          <AudioLines size={20} />
          <span>
            <strong>Ambient sound</strong>
            <small>A quiet, continuous harmony for focus</small>
          </span>
        </span>
        <button
          className={`toggle ${sound ? "on" : ""}`}
          role="switch"
          aria-checked={sound}
          aria-label="Ambient sound"
          onClick={toggleSound}
        >
          <span />
        </button>
      </div>
      <div className="settings-export">
        <span>
          <strong>Your knowledge belongs to you.</strong>
          <small>
            Notes and progress are saved in this browser. Download a copy to
            keep them safe.
          </small>
        </span>
        <button className="secondary-button" onClick={exportPalace}>
          <ArrowDownToLine size={16} /> Export all palaces
        </button>
      </div>
    </WorkspaceDialog>
  );
}

function LearningInsights() {
  const anchors = usePalaceStore((s) => s.anchors);
  const rooms = usePalaceStore((s) => s.rooms);
  const setRoom = usePalaceStore((s) => s.setRoom);
  const setMode = usePalaceStore((s) => s.setMode);
  const totalReviews = anchors.reduce((sum, a) => sum + a.reviewCount, 0);
  return (
    <div className="insights-view">
      <div className="section-kicker">
        <ChartIcon /> YOUR LEARNING, IN PERSPECTIVE
      </div>
      <h1>Look how far you’ve come.</h1>
      <p className="page-description">
        Every visit builds a stronger connection.
      </p>
      <div className="insight-metrics">
        <div>
          <Layers3 />
          <strong>{anchors.length}</strong>
          <span>Ideas given a home</span>
        </div>
        <div>
          <CheckCheck />
          <strong>
            {anchors.filter((a) => a.status === "mastered").length}
          </strong>
          <span>Anchors mastered</span>
        </div>
        <div>
          <BrainCircuit />
          <strong>{totalReviews}</strong>
          <span>Recall repetitions</span>
        </div>
      </div>
      <section className="room-insights">
        <h2>A little progress in every palace</h2>
        {rooms.map((room) => {
          const list = anchors.filter((a) => a.roomId === room.id);
          const count = list.filter((a) => a.status === "mastered").length;
          return (
            <div className="room-insight-row" key={room.id}>
              <span
                className="room-insight-icon"
                style={{ color: room.color, background: `${room.color}14` }}
              >
                <Box />
              </span>
              <span>
                <strong>{room.name}</strong>
                <small>
                  {list.length} anchors · {count} mastered
                </small>
              </span>
              <div className="progress-track">
                <div
                  style={{
                    width: `${list.length ? (count / list.length) * 100 : 0}%`,
                    background: room.color,
                  }}
                />
              </div>
              <strong>
                {list.length ? Math.round((count / list.length) * 100) : 0}%
              </strong>
              <button
                aria-label={
                  list.length ? `Practice ${room.name}` : `Open ${room.name}`
                }
                onClick={() => {
                  setRoom(room.id);
                  setMode(list.length ? "recall" : "explore");
                  window.dispatchEvent(new Event("neuroquest:palace"));
                }}
              >
                <ArrowUpRight size={20} />
              </button>
            </div>
          );
        })}
      </section>
      <div className="insights-note">
        <Lightbulb size={21} />
        <p>
          <strong>Consistency makes the connection.</strong> Try recalling a few
          anchors each day. An honest “Hard” is more useful than an uncertain
          “Easy”.
        </p>
      </div>
    </div>
  );
}

function ChartIcon() {
  return <Target size={14} />;
}

function MemoryGuide({ onStart }: { onStart: () => void }) {
  return (
    <div className="guide-view">
      <span className="section-kicker">
        <Sparkles size={14} /> AN OLD IDEA. A NEW DIMENSION.
      </span>
      <h1>A place for everything you know.</h1>
      <p className="page-description">
        Your brain remembers places. Let your knowledge move in.
      </p>
      <div className="guide-intro">
        <div className="guide-art">
          <div className="guide-art-ring" />
          <Box size={86} strokeWidth={1} />
          <span className="guide-art-dot one" />
          <span className="guide-art-dot two" />
          <span className="guide-art-dot three" />
        </div>
        <div>
          <span className="section-kicker">THE METHOD OF LOCI</span>
          <h2>
            Turn abstract ideas into
            <br />
            places you can revisit.
          </h2>
          <p>
            A memory palace connects information to objects in a familiar space.
            Here, each floating artifact is a home for a concept. Explore the
            room, form a connection, and return to see what you remember.
          </p>
          <button className="primary-button" onClick={onStart}>
            Step into your palace <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div className="guide-steps">
        {[
          {
            icon: Box,
            title: "Give an idea a home",
            description:
              "Add a concept, a useful explanation, and a distinctive shape. Place it somewhere that feels meaningful.",
          },
          {
            icon: Compass,
            title: "Take a thoughtful walk",
            description:
              "Orbit your palace and open each anchor. Notice the color, the shape, and where it sits beside other ideas.",
          },
          {
            icon: BrainCircuit,
            title: "Let your memory lead",
            description:
              "Switch to Recall challenge. Recognize a place, remember its concept, then reveal the answer and rate your recall.",
          },
        ].map(({ icon: Icon, title, description }, index) => (
          <article key={title}>
            <span className="step-number">0{index + 1}</span>
            <Icon size={26} />
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <div className="keyboard-guide">
        <Keyboard size={20} />
        <strong>A few shortcuts to feel at home</strong>
        <span>
          <kbd>⌘ / Ctrl</kbd> + <kbd>K</kbd> Search
        </span>
        <span>
          <kbd>Esc</kbd> Close a panel
        </span>
        <span>Drag to orbit · Pinch or scroll to zoom</span>
      </div>
    </div>
  );
}

export default function NeuroQuest() {
  const [page, setPage] = useState<WorkspacePage>("palace");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dialog, setDialog] = useState<
    "search" | "settings" | "controls" | "create-palace" | null
  >(null);
  const [notice, setNotice] = useState("");
  const anchors = usePalaceStore((s) => s.anchors);
  const rooms = usePalaceStore((s) => s.rooms);
  const activeRoomId = usePalaceStore((s) => s.activeRoomId);
  const mode = usePalaceStore((s) => s.mode);
  const setMode = usePalaceStore((s) => s.setMode);
  const setAddOpen = usePalaceStore((s) => s.setAddOpen);
  const resetCamera = usePalaceStore((s) => s.resetCamera);
  const sound = usePalaceStore((s) => s.soundEnabled);
  const toggleSound = usePalaceStore((s) => s.toggleSound);
  const sessionRatings = usePalaceStore((s) => s.sessionRatings);
  const selectAnchor = usePalaceStore((s) => s.selectAnchor);
  const stageRef = useRef<HTMLDivElement>(null);
  const roomAnchors = useMemo(
    () => anchors.filter((a) => a.roomId === activeRoomId),
    [anchors, activeRoomId],
  );
  const room = rooms.find((r) => r.id === activeRoomId);
  const mastered = roomAnchors.filter((a) => a.status === "mastered").length;
  const reviewed = roomAnchors.filter((a) => sessionRatings[a.id]).length;
  const roomTitle =
    activeRoomId === "computer-science"
      ? "The Knowledge Vault"
      : activeRoomId === "human-anatomy"
        ? "The Living Atlas"
        : activeRoomId === "world-history"
          ? "The Time Gallery"
          : (room?.name ?? "Your Memory Palace");
  useEffect(() => {
    void usePalaceStore.persist.rehydrate();
    const keyHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const state = usePalaceStore.getState();
        if (state.selectedAnchorId || state.isAddOpen) return;
        setDialog((current) =>
          current === "create-palace"
            ? current
            : current === "search"
              ? null
              : "search",
        );
      }
    };
    const palaceHandler = () => setPage("palace");
    window.addEventListener("keydown", keyHandler);
    window.addEventListener("neuroquest:palace", palaceHandler);
    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("neuroquest:palace", palaceHandler);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timeout);
  }, [notice]);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stageRef.current?.requestFullscreen)
        await stageRef.current.requestFullscreen();
      else
        setNotice(
          "Full-screen is unavailable in this browser. Try landscape view.",
        );
    } catch {
      setNotice("Full-screen is unavailable in this preview.");
    }
  };
  const navigateTo = (nextPage: WorkspacePage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to your palace
      </a>
      <Navigation
        page={page}
        onNavigate={navigateTo}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onCreateRoom={() => {
          setMobileOpen(false);
          setDialog("create-palace");
        }}
      />
      <div className="workspace" inert={mobileOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {page === "palace"
                ? "My memory palaces"
                : page === "insights"
                  ? "Learning insights"
                  : "The memory method"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="saved-indicator">
              <span /> Saved on this device
            </span>
            <button
              className="topbar-search"
              aria-label="Search anchors"
              onClick={() => setDialog("search")}
            >
              <Search size={17} />
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="user-avatar"
              aria-label="Workspace settings"
              onClick={() => setDialog("settings")}
            >
              NQ
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {page === "palace" ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="section-kicker">
                    <span className="kicker-line" /> A SPACE TO MAKE IT STICK
                  </div>
                  <h1>
                    {roomTitle}
                    <span className="title-sparkle">✦</span>
                  </h1>
                  <p className="page-description">
                    {activeRoomId.startsWith("room-") && room?.subtitle
                      ? room.subtitle
                      : "A home for your ideas. A shortcut to remembering."}
                  </p>
                </div>
                <button
                  className="primary-button add-main"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus size={18} /> Add memory anchor{" "}
                  <span className="button-shortcut">＋</span>
                </button>
              </div>
              <div className="palace-toolbar">
                <ModeSwitcher />
                <div className="palace-stats">
                  <span>
                    <Box size={15} />
                    <strong>{roomAnchors.length}</strong> anchors
                  </span>
                  <span>
                    <span className="stat-dot" />
                    <strong>{mastered}</strong> mastered
                  </span>
                  <span className="stat-revisit">
                    <RotateCcw size={14} />
                    <strong>{roomAnchors.length - mastered}</strong> to revisit
                  </span>
                </div>
              </div>
              <div className="palace-layout">
                <section
                  ref={stageRef}
                  className={`scene-card ${mode === "recall" ? "recall-scene" : ""}`}
                  aria-label="Interactive 3D memory palace"
                >
                  <div className="scene-surface">
                    <Scene />
                  </div>
                  <div className="scene-top">
                    <div className="scene-room-label">
                      <span className="scene-room-icon">
                        <RoomIcon icon={room?.icon ?? "book"} size={17} />
                      </span>
                      <span>
                        <strong>{room?.name}</strong>
                        <small>
                          {mode === "recall"
                            ? "RECALL CHALLENGE"
                            : "YOUR PERSONAL MEMORY SPACE"}
                        </small>
                      </span>
                      <ChevronRight size={15} />
                    </div>
                    <div className="scene-top-right">
                      <span className="live-badge">
                        <i />{" "}
                        {mode === "recall"
                          ? `${reviewed}/${roomAnchors.length} recalled`
                          : "Live space"}
                      </span>
                      <button
                        className="scene-icon-button"
                        title="Expand palace"
                        aria-label="Expand palace"
                        onClick={fullscreen}
                      >
                        <Expand size={17} />
                      </button>
                    </div>
                  </div>
                  {mode === "recall" && (
                    <div className="recall-banner">
                      <BrainCircuit size={17} />
                      <span>
                        {reviewed === roomAnchors.length && roomAnchors.length
                          ? "A little stronger than before. Challenge complete!"
                          : "Trust your memory. Pick an anchor to begin."}
                      </span>
                      {reviewed === roomAnchors.length &&
                        roomAnchors.length > 0 && (
                          <button
                            onClick={() => {
                              setMode("explore");
                              setMode("recall");
                            }}
                          >
                            Try again <RotateCcw size={13} />
                          </button>
                        )}
                    </div>
                  )}
                  <div className="scene-bottom">
                    <div className="scene-control-group">
                      <button
                        className="scene-icon-button"
                        title="Reset camera"
                        aria-label="Reset camera"
                        onClick={resetCamera}
                      >
                        <Focus size={17} />
                      </button>
                      <span />
                      <button
                        className={`scene-icon-button ${sound ? "sound-on" : ""}`}
                        title={
                          sound ? "Mute ambient sound" : "Play ambient sound"
                        }
                        aria-label={
                          sound ? "Mute ambient sound" : "Play ambient sound"
                        }
                        onClick={toggleSound}
                      >
                        {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
                      </button>
                      <button
                        className="scene-icon-button"
                        title="Scene settings"
                        aria-label="Scene settings"
                        onClick={() => setDialog("settings")}
                      >
                        <Settings2 size={17} />
                      </button>
                    </div>
                    <span className="scene-instructions">
                      <span className="mouse-outline" /> Drag to explore{" "}
                      <span>·</span> Scroll to zoom
                    </span>
                    <button
                      className="scene-icon-button scene-help"
                      aria-label="Navigation controls"
                      onClick={() => setDialog("controls")}
                    >
                      <CircleHelp size={18} />
                    </button>
                  </div>
                  <MiniMap anchors={roomAnchors} />
                  <span className="scene-corner-label">
                    <span />{" "}
                    {mode === "recall"
                      ? "LET YOUR MEMORY LEAD"
                      : "A LITTLE WORLD OF POSSIBILITY"}
                  </span>
                </section>
                <AnchorList anchors={roomAnchors} />
              </div>
              <div className="below-palace">
                <div className="palace-tip">
                  <span className="tip-icon">
                    <Lightbulb size={20} />
                  </span>
                  <p>
                    <strong>A familiar place. An unforgettable idea.</strong>
                    <span>
                      Click an object to discover what it holds. The more you
                      explore, the stronger the connection.
                    </span>
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    if (!roomAnchors.length) {
                      setAddOpen(true);
                      return;
                    }
                    if (mode !== "recall") setMode("recall");
                    const next =
                      roomAnchors.find((a) => !sessionRatings[a.id]) ??
                      roomAnchors[0];
                    if (next) selectAnchor(next.id);
                  }}
                >
                  {roomAnchors.length
                    ? "Put your memory to the test"
                    : "Add your first memory"}{" "}
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="page-footer">
                <span>Built for curious minds.</span>
                <span>
                  <span className="footer-key">↖</span> Explore. Connect.
                  Remember.
                </span>
              </div>
            </>
          ) : page === "insights" ? (
            <LearningInsights />
          ) : (
            <MemoryGuide onStart={() => setPage("palace")} />
          )}
        </main>
      </div>
      <AnchorDrawer />
      <AddAnchorModal />
      <AddRoomModal
        isOpen={dialog === "create-palace"}
        onClose={() => setDialog(null)}
        onCreated={() => {
          setDialog(null);
          navigateTo("palace");
        }}
      />
      <AmbientSound />
      {dialog === "search" && (
        <SearchDialog
          onClose={() => setDialog(null)}
          onNavigate={() => setPage("palace")}
        />
      )}
      {dialog === "settings" && (
        <SettingsDialog onClose={() => setDialog(null)} />
      )}
      {dialog === "controls" && (
        <WorkspaceDialog
          title="Find your way around"
          onClose={() => setDialog(null)}
        >
          <div className="controls-list">
            <p>
              <Compass />
              <span>
                <strong>Look around</strong>Drag with your mouse, or swipe with
                one finger.
              </span>
            </p>
            <p>
              <Search />
              <span>
                <strong>Take a closer look</strong>Scroll the wheel, or pinch
                with two fingers.
              </span>
            </p>
            <p>
              <Diamond />
              <span>
                <strong>Follow an idea</strong>Click a floating object, a map
                dot, or an anchor in the list.
              </span>
            </p>
            <p>
              <Focus />
              <span>
                <strong>Come back home</strong>The focus button resets your view
                of the whole room.
              </span>
            </p>
          </div>
        </WorkspaceDialog>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}
