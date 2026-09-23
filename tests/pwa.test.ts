import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";

function worker(fetch = vi.fn().mockResolvedValue("network response")) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const add = vi.fn().mockResolvedValue(undefined);
  const caches = {
    open: vi.fn().mockResolvedValue({ add }),
    match: vi.fn().mockResolvedValue("offline page"),
    keys: vi
      .fn()
      .mockResolvedValue([
        "other-app",
        "neuroquest-offline-v0",
        "neuroquest-offline-v1",
      ]),
    delete: vi.fn().mockResolvedValue(true),
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { origin: "https://neuroquest.example" },
      addEventListener: (name: string, handler: (event: unknown) => void) => {
        listeners[name] = handler;
      },
    },
    caches,
    fetch,
    URL,
    Response,
  });
  return { listeners, add, caches, fetch };
}

describe("install and offline privacy", () => {
  it("provides install metadata and correctly sized application icons", () => {
    const data = manifest();
    expect(data.display).toBe("standalone");
    expect(data.start_url).toBe("/");
    expect(data.icons).toHaveLength(3);
    for (const icon of data.icons!) {
      const bytes = readFileSync(`public${icon.src}`);
      const expected = Number(icon.sizes?.split("x")[0]);
      expect(bytes.readUInt32BE(16)).toBe(expected);
      expect(bytes.readUInt32BE(20)).toBe(expected);
    }
  });
  it("caches only the public offline page at install", async () => {
    const { listeners, add } = worker();
    let installed!: Promise<void>;
    listeners.install({
      waitUntil: (promise: Promise<void>) => {
        installed = promise;
      },
    });
    await installed;
    expect(add).toHaveBeenCalledExactlyOnceWith("/offline.html");
  });
  it("never intercepts Firebase requests or form submissions", () => {
    const { listeners, fetch } = worker();
    const respondWith = vi.fn();
    for (const request of [
      { method: "GET", mode: "cors", url: "https://firestore.googleapis.com/" },
      { method: "POST", mode: "navigate", url: "https://neuroquest.example/" },
      { method: "GET", mode: "navigate", url: "https://accounts.google.com/" },
    ])
      listeners.fetch({ request, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses a generic offline page when navigation fails", async () => {
    const { listeners, caches } = worker(
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    let response!: Promise<string>;
    listeners.fetch({
      request: {
        method: "GET",
        mode: "navigate",
        url: "https://neuroquest.example/",
      },
      respondWith: (promise: Promise<string>) => {
        response = promise;
      },
    });
    expect(await response).toBe("offline page");
    expect(caches.match).toHaveBeenCalledWith("/offline.html");
  });
  it("does not remove other applications' caches", async () => {
    const { listeners, caches } = worker();
    let activated!: Promise<void>;
    listeners.activate({
      waitUntil: (promise: Promise<void>) => {
        activated = promise;
      },
    });
    await activated;
    expect(caches.delete).toHaveBeenCalledExactlyOnceWith(
      "neuroquest-offline-v0",
    );
  });
});
