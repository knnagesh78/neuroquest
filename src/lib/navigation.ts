export type WorkspacePage = "palace" | "insights" | "guide" | "profile";
export type WorkspaceRoute = { page: WorkspacePage; roomId: string | null };

const HISTORY_KEY = "neuroquestNavigation";
const pages = new Set<WorkspacePage>([
  "palace",
  "insights",
  "guide",
  "profile",
]);

type NavigationHost = {
  location: { href: string };
  history: {
    state: unknown;
    pushState: (
      data: unknown,
      unused: string,
      url?: string | URL | null,
    ) => void;
    replaceState: (
      data: unknown,
      unused: string,
      url?: string | URL | null,
    ) => void;
    back: () => void;
  };
  addEventListener: (name: "popstate", listener: () => void) => void;
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export function readWorkspaceRoute(href: string): WorkspaceRoute {
  const url = new URL(href, "https://neuroquest.invalid");
  const view = url.searchParams.get("view") as WorkspacePage;
  const room = url.searchParams.get("room");
  return {
    page: pages.has(view) ? view : "palace",
    roomId:
      room && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(room) ? room : null,
  };
}

/** History contains screen IDs only, never notes, credentials or form drafts. */
export class AppNavigation {
  private listeners = new Set<() => void>();
  private panels = new Map<string, { dismiss: () => void; token: symbol }>();
  private pendingBack = false;
  private started = false;

  constructor(private host: NavigationHost) {}

  private start() {
    if (this.started) return;
    this.started = true;
    const href = this.host.location.href;
    const hasAppEntry = Array.isArray(
      record(record(this.host.history.state)[HISTORY_KEY]).panels,
    );
    // A profile/insights link opened directly also needs a home screen behind
    // it. Refreshing an existing app entry must not add another home entry.
    if (!hasAppEntry && readWorkspaceRoute(href).page !== "palace") {
      const home = new URL(href);
      home.searchParams.delete("view");
      this.write("replaceState", home.href, []);
      this.write("pushState", href, []);
    }
    // A reload cannot restore an old modal's React state. Keep its screen only.
    this.write("replaceState", href, []);
    this.host.addEventListener("popstate", () => {
      this.pendingBack = false;
      const wanted = this.panelIds();
      for (const [id, panel] of this.panels) {
        if (!wanted.includes(id)) panel.dismiss();
      }
      const active = wanted.filter((id) => this.panels.has(id));
      if (active.length !== wanted.length)
        this.write("replaceState", this.host.location.href, active);
      this.emit();
    });
  }

  private panelIds(): string[] {
    const value = record(record(this.host.history.state)[HISTORY_KEY]).panels;
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string").slice(0, 20)
      : [];
  }

  private write(
    method: "pushState" | "replaceState",
    url: string,
    panels: string[],
  ) {
    // Preserve Next.js's private router state when adding our own namespace.
    this.host.history[method](
      { ...record(this.host.history.state), [HISTORY_KEY]: { panels } },
      "",
      url,
    );
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  subscribe = (listener: () => void) => {
    this.start();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  snapshot = () => this.host.location.href;

  navigate(page: WorkspacePage, roomId: string | null, replace = false) {
    this.start();
    const url = new URL(this.host.location.href);
    if (page === "palace") url.searchParams.delete("view");
    else url.searchParams.set("view", page);
    if (roomId) url.searchParams.set("room", roomId);
    else url.searchParams.delete("room");
    url.hash = "";
    const openPanels = this.panelIds();
    if (url.href === this.host.location.href && !replace) {
      if (openPanels.length && !this.pendingBack) {
        this.pendingBack = true;
        this.host.history.back();
      }
      return;
    }
    // Selecting a screen from a menu replaces that menu's temporary entry.
    this.write(
      replace || openPanels.length ? "replaceState" : "pushState",
      url.href,
      [],
    );
    for (const panel of this.panels.values()) panel.dismiss();
    this.emit();
  }

  registerPanel(id: string, dismiss: () => void) {
    this.start();
    const token = Symbol(id);
    const previous = this.panelIds();
    const active = previous.filter((key) => this.panels.has(key));
    this.panels.set(id, { dismiss, token });
    if (!previous.includes(id)) {
      // A menu swapped for a dialog in one React commit should use one entry.
      this.write(
        previous.length > active.length ? "replaceState" : "pushState",
        this.host.location.href,
        [...active, id],
      );
    }
    return () => {
      if (this.panels.get(id)?.token !== token) return;
      this.panels.delete(id);
      // Strict Mode cleans up and immediately re-registers effects. Defer until
      // that cycle finishes so it cannot add entries or navigate backwards.
      queueMicrotask(() => {
        if (this.panels.has(id) || this.pendingBack) return;
        const current = this.panelIds();
        if (current.at(-1) === id) {
          this.pendingBack = true;
          this.host.history.back();
        } else if (current.includes(id)) {
          this.write(
            "replaceState",
            this.host.location.href,
            current.filter((key) => key !== id),
          );
        }
      });
    };
  }
}

let navigation: AppNavigation | undefined;
export function getAppNavigation() {
  return (navigation ??= new AppNavigation(window));
}
