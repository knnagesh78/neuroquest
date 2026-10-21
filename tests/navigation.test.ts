import { describe, expect, it, vi } from "vitest";
import { AppNavigation, readWorkspaceRoute } from "@/lib/navigation";

function setup(href = "https://neuroquest.test/?room=room-a") {
  const entries: Array<{ href: string; state: Record<string, unknown> }> = [
    { href: "https://college.test/", state: {} },
    { href, state: { __NA: true, tree: "next-router-state" } },
  ];
  let index = 1;
  const popListeners = new Set<() => void>();
  const location = { href };
  const move = (offset: number) => {
    if (!entries[index + offset]) return;
    index += offset;
    location.href = entries[index].href;
    popListeners.forEach((listener) => listener());
  };
  const host = {
    location,
    history: {
      get state() {
        return entries[index].state;
      },
      pushState(data: unknown, _unused: string, url?: string | URL | null) {
        location.href = String(url ?? location.href);
        entries.splice(++index, entries.length, {
          href: location.href,
          state: data as Record<string, unknown>,
        });
      },
      replaceState(data: unknown, _unused: string, url?: string | URL | null) {
        location.href = String(url ?? location.href);
        entries[index] = {
          href: location.href,
          state: data as Record<string, unknown>,
        };
      },
      back: vi.fn(() => queueMicrotask(() => move(-1))),
    },
    addEventListener(_name: "popstate", listener: () => void) {
      popListeners.add(listener);
    },
  };
  const navigation = new AppNavigation(host);
  return {
    navigation,
    host,
    entries,
    back: async () => {
      host.history.back();
      await Promise.resolve();
    },
    forward: () => move(1),
  };
}

describe("workspace screen history", () => {
  it("returns home from a directly opened profile without adding entries on refresh", async () => {
    const { navigation, host, entries, back } = setup(
      "https://neuroquest.test/?room=room-a&view=profile",
    );
    navigation.subscribe(vi.fn());
    expect(readWorkspaceRoute(host.location.href).page).toBe("profile");
    expect(entries).toHaveLength(3);
    const restored = new AppNavigation(host);
    restored.subscribe(vi.fn());
    expect(entries).toHaveLength(3);
    await back();
    expect(readWorkspaceRoute(host.location.href)).toEqual({
      page: "palace",
      roomId: "room-a",
    });
  });
  it("returns through previous screens and rooms without leaving the app", async () => {
    const { navigation, host, back, forward } = setup();
    navigation.navigate("profile", "room-a");
    navigation.navigate("palace", "room-b");
    navigation.navigate("insights", "room-b");
    await back();
    expect(readWorkspaceRoute(host.location.href)).toEqual({
      page: "palace",
      roomId: "room-b",
    });
    await back();
    expect(readWorkspaceRoute(host.location.href)).toEqual({
      page: "profile",
      roomId: "room-a",
    });
    await back();
    expect(readWorkspaceRoute(host.location.href)).toEqual({
      page: "palace",
      roomId: "room-a",
    });
    forward();
    expect(readWorkspaceRoute(host.location.href).page).toBe("profile");
    expect(host.history.state).toMatchObject({
      __NA: true,
      tree: "next-router-state",
    });
  });
  it("does not create extra history when the current screen is selected again", () => {
    const { navigation, entries } = setup();
    navigation.navigate("palace", "room-a");
    navigation.navigate("palace", "room-a");
    expect(entries).toHaveLength(2);
  });
  it("validates URL inputs and stores no study content", () => {
    expect(readWorkspaceRoute("/?view=unknown&room=../../private")).toEqual({
      page: "palace",
      roomId: null,
    });
    const { navigation, host } = setup(
      "https://neuroquest.test/?view=profile&room=room-a",
    );
    expect(readWorkspaceRoute(navigation.snapshot()).page).toBe("profile");
    navigation.navigate("guide", "room-a");
    expect(host.history.state).toEqual({
      __NA: true,
      tree: "next-router-state",
      neuroquestNavigation: { panels: [] },
    });
  });
});

describe("phone Back for dialogs and menus", () => {
  it("dismisses a drawer before returning to the previous screen", async () => {
    const { navigation, host, back } = setup();
    navigation.navigate("profile", "room-a");
    let release = () => {};
    const close = vi.fn(() => release());
    release = navigation.registerPanel("drawer", close);
    await back();
    expect(close).toHaveBeenCalledTimes(1);
    expect(readWorkspaceRoute(host.location.href).page).toBe("profile");
    await back();
    expect(readWorkspaceRoute(host.location.href).page).toBe("palace");
  });
  it("consumes a manually closed panel's entry without adding an extra Back press", async () => {
    const { navigation, host, back } = setup();
    navigation.navigate("profile", "room-a");
    const release = navigation.registerPanel("search", vi.fn());
    release();
    await Promise.resolve();
    await Promise.resolve();
    await back();
    expect(readWorkspaceRoute(host.location.href).page).toBe("palace");
  });
  it("does not navigate or duplicate history during React Strict Mode cleanup", async () => {
    const { navigation, host, entries, back } = setup();
    const release = navigation.registerPanel("form", vi.fn());
    release();
    const close = vi.fn();
    navigation.registerPanel("form", close);
    await Promise.resolve();
    expect(host.history.back).not.toHaveBeenCalled();
    expect(entries).toHaveLength(3);
    await back();
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("replaces an open navigation menu with the selected screen", async () => {
    const { navigation, host, back } = setup();
    const close = vi.fn();
    const release = navigation.registerPanel("mobile-menu", close);
    navigation.navigate("profile", "room-a");
    release();
    await Promise.resolve();
    expect(close).toHaveBeenCalledTimes(1);
    expect(readWorkspaceRoute(host.location.href).page).toBe("profile");
    await back();
    expect(readWorkspaceRoute(host.location.href).page).toBe("palace");
  });
  it("swaps a menu for an account dialog without leaving a stale menu entry", async () => {
    const { navigation, entries, host, back } = setup();
    navigation.registerPanel("menu", vi.fn())();
    const release = navigation.registerPanel("account", vi.fn());
    await Promise.resolve();
    expect(entries).toHaveLength(3);
    release();
    await Promise.resolve();
    await Promise.resolve();
    expect(host.location.href).toBe("https://neuroquest.test/?room=room-a");
    await back();
    expect(host.location.href).toBe("https://college.test/");
  });
});
