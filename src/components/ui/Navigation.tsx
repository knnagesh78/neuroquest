"use client";

import {
  Box,
  Boxes,
  ChartNoAxesCombined,
  BookOpen,
  CircleHelp,
  ArrowUpRight,
  Download,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import { usePalaceStore } from "@/store/usePalaceStore";
import Link from "next/link";
import { useEffect, useRef } from "react";
import RoomIcon from "./RoomIcon";
import { useAccountStore } from "@/store/useAccountStore";

export type WorkspacePage = "palace" | "insights" | "guide";
type Props = {
  page: WorkspacePage;
  onNavigate: (page: WorkspacePage) => void;
  mobileOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
};

export default function Navigation({
  page,
  onNavigate,
  mobileOpen,
  onClose,
  onCreateRoom,
}: Props) {
  const rooms = usePalaceStore((s) => s.rooms);
  const username = useAccountStore((s) => s.username);
  const activeRoomId = usePalaceStore((s) => s.activeRoomId);
  const setRoom = usePalaceStore((s) => s.setRoom);
  const go = (next: WorkspacePage) => {
    onNavigate(next);
    onClose();
  };
  const sidebarRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current
      ?.querySelector<HTMLElement>(".mobile-nav-close")
      ?.focus();
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const items = [
        ...(sidebarRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button",
        ) ?? []),
      ].filter((item) => item.getClientRects().length > 0);
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyHandler);
    const desktop = window.matchMedia("(min-width: 761px)");
    const handleResize = () => {
      if (desktop.matches) closeRef.current();
    };
    desktop.addEventListener("change", handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyHandler);
      desktop.removeEventListener("change", handleResize);
      previousFocus?.focus();
    };
  }, [mobileOpen]);
  return (
    <>
      {mobileOpen && (
        <button
          className="mobile-nav-backdrop"
          aria-hidden="true"
          tabIndex={-1}
          onClick={onClose}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen || undefined}
        aria-label={mobileOpen ? "Workspace navigation" : "Workspace"}
      >
        <Link className="brand" href="/" aria-label="NeuroQuest home">
          <span className="brand-mark">
            <Box size={24} strokeWidth={1.8} />
          </span>
          <span>
            neuro<span className="brand-light">quest</span>
            <span className="brand-dot">.</span>
          </span>
        </Link>
        <button
          className="mobile-nav-close icon-button"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <div className="workspace-badge">
          <span className="workspace-avatar">
            {username.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <span className="account-workspace-name" title={username}>
              @{username}
            </span>
            <small>Your private workspace</small>
          </span>
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          <button
            className={page === "palace" ? "active" : ""}
            onClick={() => go("palace")}
          >
            <Boxes size={18} /> My memory palaces{" "}
            <span className="nav-count">{rooms.length}</span>
          </button>
          <button
            className={page === "insights" ? "active" : ""}
            onClick={() => go("insights")}
          >
            <ChartNoAxesCombined size={18} /> Learning insights
          </button>
          <button
            className={page === "guide" ? "active" : ""}
            onClick={() => go("guide")}
          >
            <BookOpen size={18} /> The memory method{" "}
            <ArrowUpRight size={14} className="nav-end" />
          </button>
        </nav>
        <div className="nav-section-heading">
          <p className="nav-caption">YOUR PALACES</p>
          <span>{String(rooms.length).padStart(2, "0")}</span>
        </div>
        <nav className="room-nav" aria-label="Memory palaces">
          {rooms.map((room) => {
            return (
              <button
                key={room.id}
                className={
                  activeRoomId === room.id && page === "palace" ? "current" : ""
                }
                onClick={() => {
                  setRoom(room.id);
                  go("palace");
                }}
              >
                <span
                  className="room-icon"
                  style={{ color: room.color, background: `${room.color}16` }}
                >
                  <RoomIcon icon={room.icon} />
                </span>
                <span className="room-nav-name" title={room.name}>
                  {room.name}
                </span>
                {activeRoomId === room.id && page === "palace" && (
                  <span className="active-room-dot" />
                )}
              </button>
            );
          })}
          <button className="create-room-button" onClick={onCreateRoom}>
            <Plus size={16} />
            <span>Create palace</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button
            className="help-link install-nav"
            onClick={() => {
              onClose();
              setTimeout(
                () => window.dispatchEvent(new Event("neuroquest:install")),
                100,
              );
            }}
          >
            <Download size={17} /> Install NeuroQuest
          </button>
          <div className="sidebar-note">
            <div className="note-orbit">
              <span />
              <Box size={27} />
              <i />
              <b />
            </div>
            <span className="small-spark">
              <Sparkles size={13} /> A BETTER WAY TO REMEMBER
            </span>
            <h3>
              Ideas need a place.
              <br />
              Give yours a palace.
            </h3>
            <button onClick={() => go("guide")}>
              Discover the method <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="help-link" onClick={() => go("guide")}>
            <CircleHelp size={17} /> A little guidance <span>↗</span>
          </button>
          <div className="sidebar-footer">
            <span className="online-dot" /> Your knowledge. Your space.
            <span>v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
