import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type EventHandler = (event: unknown) => void;
const origin = "https://neuroquest.example";
const job = "b38a4860-fd01-4385-a579-ad255491693d";
function asset(owner = "alice", id = job) {
  return `${origin}/api/anchors/assets/${owner}/${id}/model.glb`;
}
function token(uid: string, expired = false) {
  return `header.${Buffer.from(JSON.stringify({ sub: uid, exp: Date.now() / 1000 + (expired ? -60 : 3600) })).toString("base64url")}.signature`;
}
function harness() {
  const handlers: Record<string, EventHandler> = {};
  const entries = new Map<string, Map<string, Response>>();
  const savedRequests: Request[] = [];
  const fetcher = vi.fn().mockImplementation(
    async () =>
      new Response("model bytes", {
        headers: { "X-NeuroQuest-Owner": "alice", Vary: "Authorization" },
      }),
  );
  const caches = {
    keys: async () => [...entries.keys()],
    delete: vi.fn(async (name: string) => entries.delete(name)),
    open: vi.fn(async (name: string) => {
      if (!entries.has(name)) entries.set(name, new Map());
      const data = entries.get(name)!;
      return {
        match: async (request: Request) => data.get(request.url)?.clone(),
        put: async (request: Request, response: Response) => {
          savedRequests.push(request);
          data.set(request.url, response.clone());
        },
        keys: async () => [...data.keys()].map((url) => new Request(url)),
        delete: async (request: Request) => data.delete(request.url),
      };
    }),
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { origin },
      addEventListener: (name: string, handler: EventHandler) => {
        handlers[name] = handler;
      },
    },
    caches,
    fetch: fetcher,
    URL,
    Request,
    Response,
    Headers,
    atob,
  });
  async function session(uid: string | null, client = "tab-1") {
    let pending!: Promise<void>;
    const ack = vi.fn();
    handlers.message({
      data: { type: "NEUROQUEST_ASSET_SESSION", uid },
      source: { id: client },
      ports: [{ postMessage: ack }],
      waitUntil: (promise: Promise<void>) => {
        pending = promise;
      },
    });
    await pending;
    expect(ack).toHaveBeenCalledOnce();
  }
  function get(url = asset(), bearer = token("alice"), clientId = "tab-1") {
    let result: Promise<Response> | undefined;
    const request = new Request(url, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    handlers.fetch({
      request,
      clientId,
      respondWith: (promise: Promise<Response>) => {
        result = promise;
      },
    });
    return result;
  }
  return { entries, caches, fetcher, savedRequests, session, get };
}

describe("private GLB revisit cache", () => {
  it("caches an owner-verified response without credentials and serves the next revisit", async () => {
    const h = harness();
    await h.session("alice");
    expect(await (await h.get()!).text()).toBe("model bytes");
    h.fetcher.mockRejectedValue(new Error("offline"));
    expect(await (await h.get()!).text()).toBe("model bytes");
    expect(h.fetcher).toHaveBeenCalledOnce();
    expect(h.savedRequests[0].headers.get("Authorization")).toBeNull();
    expect(
      [...h.entries.values()][0].get(asset())?.headers.get("Vary"),
    ).toBeNull();
  });
  it("does not intercept other owners, expired tokens, thumbnails or generation requests", async () => {
    const h = harness();
    await h.session("alice");
    expect(h.get(asset("bob"), token("bob"))).toBeUndefined();
    expect(h.get(asset(), token("alice", true))).toBeUndefined();
    expect(
      h.get(asset().replace("model.glb", "thumbnail.webp")),
    ).toBeUndefined();
    expect(
      h.get(`${origin}/api/anchors/ai-generate?jobId=${job}`),
    ).toBeUndefined();
    expect(h.get(asset(), token("alice"), "unknown-tab")).toBeUndefined();
    expect(h.fetcher).not.toHaveBeenCalled();
  });
  it("does not cache rejected or wrong-owner network responses", async () => {
    const h = harness();
    await h.session("alice");
    h.fetcher
      .mockResolvedValueOnce(new Response("denied", { status: 401 }))
      .mockResolvedValueOnce(
        new Response("wrong owner", {
          headers: { "X-NeuroQuest-Owner": "bob" },
        }),
      );
    await h.get();
    await h.get();
    expect(h.savedRequests).toEqual([]);
  });
  it("removes private buffers on sign-out and account switching", async () => {
    const h = harness();
    await h.session("alice");
    await h.get();
    await h.session("bob");
    expect(h.entries.has("neuroquest-models-v1-alice")).toBe(false);
    await h.session(null);
    expect(
      [...h.entries.keys()].filter((key) =>
        key.startsWith("neuroquest-models-"),
      ),
    ).toEqual([]);
  });
  it("ignores an in-flight download after the account has signed out", async () => {
    const h = harness();
    await h.session("alice");
    let finish!: (response: Response) => void;
    h.fetcher.mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    );
    const pending = h.get()!;
    await vi.waitFor(() => expect(h.fetcher).toHaveBeenCalledOnce());
    await h.session(null);
    finish(
      new Response("model", { headers: { "X-NeuroQuest-Owner": "alice" } }),
    );
    await pending;
    expect(h.savedRequests).toEqual([]);
    expect(h.entries.has("neuroquest-models-v1-alice")).toBe(false);
  });
  it("bounds the cache to eight models and loads from the network if cache access fails", async () => {
    const h = harness();
    await h.session("alice");
    for (let i = 0; i < 10; i++)
      await h.get(
        asset(
          "alice",
          `b38a4860-fd01-4385-a579-${String(i).padStart(12, "0")}`,
        ),
      );
    expect(h.entries.get("neuroquest-models-v1-alice")?.size).toBe(8);
    h.caches.open.mockRejectedValueOnce(new Error("storage disabled"));
    expect(await (await h.get()!).text()).toBe("model bytes");
  });
});
