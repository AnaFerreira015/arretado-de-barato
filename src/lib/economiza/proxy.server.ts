// Server-only proxy to the SEFAZ/AL Economiza Alagoas API.
// Only the two documented operations are allowed; the client never supplies a URL.
import { getRequestHeader } from "@tanstack/react-start/server";
import { CACHE, MESSAGES, NET, type ErrorCode } from "./constants";
import { adaptPage, UnexpectedResponseError, type SearchPage } from "./adapter";

export type Operation = "produto/pesquisa" | "combustivel/pesquisa";

export type ProxyResult =
  | { ok: true; page: SearchPage; fetchedAt: string; cached: boolean; demo: boolean }
  | { ok: false; code: ErrorCode; message: string; detail?: string | undefined };

export type ApiStatus = "ready" | "not_configured" | "insecure_transport";

export function apiStatus(): ApiStatus {
  const token = process.env["ECONOMIZA_APP_TOKEN"];
  const base = process.env["ECONOMIZA_API_BASE_URL"];
  if (!token || !base) return "not_configured";
  // Never send the token over plain HTTP.
  if (!base.toLowerCase().startsWith("https://")) return "insecure_transport";
  return "ready";
}

// ---- short-lived cache (per worker isolate) ----
const cache = new Map<string, { at: number; value: { page: SearchPage; fetchedAt: string } }>();
function cacheGet(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE.ttlMs) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}
function cacheSet(key: string, value: { page: SearchPage; fetchedAt: string }) {
  if (cache.size >= CACHE.maxEntries) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
}
/** Stable key: operation + every request field, with sorted object keys. */
export function cacheKey(op: Operation, body: unknown): string {
  const stable = (v: unknown): unknown =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, stable((v as Record<string, unknown>)[k])]))
      : v;
  return `${op}:${JSON.stringify(stable(body))}`;
}

// ---- simple per-client rate limit (per isolate, best effort) ----
const hits = new Map<string, number[]>();
function rateLimited(): boolean {
  let id = "anon";
  try {
    id = getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  } catch {
    /* no request context (tests) */
  }
  const now = Date.now();
  const arr = (hits.get(id) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(id, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > NET.rateLimitPerMinute;
}

const fail = (code: ErrorCode, detail?: string): ProxyResult => ({ ok: false, code, message: MESSAGES[code], detail });

export async function callApi(op: Operation, body: unknown, kind: "produto" | "combustivel"): Promise<ProxyResult> {
  if (rateLimited()) return fail("rate_limited");
  const status = apiStatus();
  if (status !== "ready") return fail(status);

  const key = cacheKey(op, body);
  const hit = cacheGet(key);
  if (hit) return { ok: true, ...hit, cached: true, demo: false };

  const base = process.env["ECONOMIZA_API_BASE_URL"]!.replace(/\/+$/, "") + "/";
  const url = new URL(op, base).toString();
  const token = process.env["ECONOMIZA_APP_TOKEN"]!;

  for (let attempt = 0; attempt <= NET.retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), NET.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", AppToken: token },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const text = await res.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        /* non-JSON */
      }
      const apiMsg =
        json && typeof json === "object" && typeof (json as { message?: unknown }).message === "string"
          ? String((json as { message: string }).message).slice(0, 150)
          : undefined;
      if (res.status === 401 || res.status === 403 || (apiMsg && /token/i.test(apiMsg))) return fail("auth");
      if (res.status >= 500 || res.status === 429) {
        if (attempt < NET.retries) {
          await new Promise((r) => setTimeout(r, NET.retryDelayMs));
          continue;
        }
        return fail("unavailable");
      }
      if (!res.ok) return fail("api_error", apiMsg);
      try {
        const page = adaptPage(json, kind);
        const value = { page, fetchedAt: new Date().toISOString() };
        cacheSet(key, value);
        return { ok: true, ...value, cached: false, demo: false };
      } catch (e) {
        if (e instanceof UnexpectedResponseError) {
          if (apiMsg) return fail("api_error", apiMsg);
          console.warn(`[economiza] unexpected response shape for ${op} (status ${res.status})`);
          return fail("unexpected");
        }
        throw e;
      }
    } catch (e) {
      clearTimeout(timer);
      const isAbort = e instanceof Error && e.name === "AbortError";
      if (attempt < NET.retries) {
        await new Promise((r) => setTimeout(r, NET.retryDelayMs));
        continue;
      }
      // Log without token, body or coordinates.
      console.warn(`[economiza] ${op} failed: ${isAbort ? "timeout" : "network"}`);
      return fail(isAbort ? "timeout" : "unavailable");
    }
  }
  return fail("unavailable");
}
