import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker() {
  const listeners: Record<string, (event: unknown) => void> = {};
  const cache = {
    add: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue({ offline: true }),
  };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi
      .fn()
      .mockResolvedValue(["arretado-offline-v0", "arretado-offline-v1", "unrelated-cache"]),
    delete: vi.fn().mockResolvedValue(true),
  };
  const fetch = vi.fn().mockResolvedValue({ online: true });
  const claim = vi.fn().mockResolvedValue(undefined);
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      addEventListener: (name: string, fn: (event: unknown) => void) => {
        listeners[name] = fn;
      },
      location: { origin: "https://example.com" },
      clients: { claim },
    },
    caches,
    fetch,
    URL,
    Request: class {
      constructor(
        public url: string,
        public options: unknown,
      ) {}
    },
    Response: class {
      constructor(
        public body: string,
        public options: unknown,
      ) {}
    },
  });
  return { listeners, cache, caches, fetch, claim };
}
const navigation = {
  method: "GET",
  mode: "navigate",
  url: "https://example.com/?tipo=combustivel",
};
describe("service worker", () => {
  it("pré-carrega apenas o aviso offline", async () => {
    const w = worker();
    let pending: Promise<unknown>;
    w.listeners["install"]!({
      waitUntil: (p: Promise<unknown>) => {
        pending = p;
      },
    });
    await pending!;
    expect(w.cache.add).toHaveBeenCalledTimes(1);
    expect(w.cache.add.mock.calls[0]![0].url).toBe("/offline.html");
  });
  it("preserva caches de outros recursos e ativa sem forçar recarga", async () => {
    const w = worker();
    let pending: Promise<unknown>;
    w.listeners["activate"]!({
      waitUntil: (p: Promise<unknown>) => {
        pending = p;
      },
    });
    await pending!;
    expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith("arretado-offline-v0");
    expect(w.claim).toHaveBeenCalledOnce();
  });
  it("retorna navegação online sem cachear HTML ou resposta", async () => {
    const w = worker();
    const respondWith = vi.fn();
    w.listeners["fetch"]!({ request: navigation, respondWith });
    expect(await respondWith.mock.calls[0]![0]).toEqual({ online: true });
    expect(w.caches.open).not.toHaveBeenCalled();
  });
  it("mostra aviso quando a navegação falha", async () => {
    const w = worker();
    w.fetch.mockRejectedValue(new Error("offline"));
    const respondWith = vi.fn();
    w.listeners["fetch"]!({ request: navigation, respondWith });
    expect(await respondWith.mock.calls[0]![0]).toEqual({ offline: true });
  });
  it("tem fallback se o cache tiver sido removido", async () => {
    const w = worker();
    w.fetch.mockRejectedValue(new Error("offline"));
    w.cache.match.mockResolvedValue(undefined);
    const respondWith = vi.fn();
    w.listeners["fetch"]!({ request: navigation, respondWith });
    expect(await respondWith.mock.calls[0]![0]).toMatchObject({ options: { status: 503 } });
  });
  it.each([
    { ...navigation, method: "POST" },
    { ...navigation, mode: "cors", url: "https://example.com/api/search" },
    { ...navigation, url: "https://other.example/" },
  ])("não intercepta consultas ou recursos externos: %j", (request) => {
    const w = worker();
    const respondWith = vi.fn();
    w.listeners["fetch"]!({ request, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
    expect(w.fetch).not.toHaveBeenCalled();
  });
});
