"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  variant?: "drawer" | "modal";
  className?: string;
  children: ReactNode;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");
const subscribeToClient = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const subscribeToFullscreen = (notify: () => void) => {
  document.addEventListener("fullscreenchange", notify);
  return () => document.removeEventListener("fullscreenchange", notify);
};
const fullscreenSnapshot = () => document.fullscreenElement;
const serverFullscreenSnapshot = () => null;

/** A portaled, keyboard-contained dialog with focus restoration and exit motion. */
export default function Dialog({
  isOpen,
  onClose,
  titleId,
  descriptionId,
  variant = "modal",
  className = "",
  children,
}: DialogProps) {
  const mounted = useSyncExternalStore(
    subscribeToClient,
    clientSnapshot,
    serverSnapshot,
  );
  const fullscreenRoot = useSyncExternalStore(
    subscribeToFullscreen,
    fullscreenSnapshot,
    serverFullscreenSnapshot,
  );
  const [rendered, setRendered] = useState(isOpen);
  const [lastChildren, setLastChildren] = useState(children);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      const frame = window.requestAnimationFrame(() => {
        setRendered(true);
        setLastChildren(children);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const timeout = window.setTimeout(() => setRendered(false), 200);
    return () => window.clearTimeout(timeout);
  }, [isOpen, children]);

  useEffect(() => {
    if (!isOpen || !mounted || !rendered) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const portalRoot = fullscreenRoot ?? document.body;
    const background = [...portalRoot.children]
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && !element.contains(panelRef.current),
      )
      .map((element) => ({ element, inert: element.inert }));
    background.forEach(({ element }) => {
      element.inert = true;
    });
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      const first =
        panel?.querySelector<HTMLElement>("[data-autofocus]") ??
        panel?.querySelector<HTMLElement>(focusableSelector);
      (first ?? panel)?.focus({ preventScroll: true });
    });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = [
        ...panel.querySelectorAll<HTMLElement>(focusableSelector),
      ].filter(
        (element) =>
          element.getClientRects().length > 0 &&
          element.getAttribute("aria-hidden") !== "true",
      );
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel ||
          !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKey, true);
      document.body.style.overflow = previousOverflow;
      background.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen, mounted, rendered, fullscreenRoot]);

  if (!mounted || !rendered) return null;

  return createPortal(
    <div
      className={`dialog-layer dialog-layer--${variant}`}
      data-state={isOpen ? "open" : "closed"}
      inert={!isOpen}
    >
      <div
        className="dialog-scrim"
        aria-hidden="true"
        onClick={() => closeRef.current()}
      />
      <div
        ref={panelRef}
        className={`dialog-panel dialog-panel--${variant} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        {isOpen ? children : lastChildren}
      </div>
    </div>,
    fullscreenRoot ?? document.body,
  );
}
