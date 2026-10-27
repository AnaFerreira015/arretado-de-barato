// Server-only proxy to the SEFAZ/AL Economiza Alagoas API.
// Only the two documented operations are allowed; the client never supplies a URL.
import { getRequestHeader } from "@tanstack/react-start/server";
import { CACHE, MESSAGES, NET, type ErrorCode } from "./constants";
import { adaptPage, UnexpectedResponseError, type SearchPage } from "./adapter";

export type Operation = "produto/pesquisa" | "combustivel/pesquisa";

export type ProxyResult =
  | { ok: true; page: SearchPage; fetchedAt: string; cached: boolean; demo: boolean }
  | { ok: false; code: ErrorCode; message: string; detail?: string | undefined };

export type ApiStatus = "ready" | "not_configured" | "endpoint_not_configured" | "insecure_transport";

export function apiStatus(): ApiStatus {
  const token = process.env["ECONOMIZA_APP_TOKEN"];
  const base = process.env["ECONOMIZA_API_BASE_URL"];
  if (!token) return "not_configured";
  if (!base) return "endpoint_not_configured";
  let url: URL;
  try { url = new URL(base); } catch { return "endpoint_not_configured"; }
  const officialHttp = process.env["ECONOMIZA_ALLOW_HTTP"] === "true"
    && url.origin === "http://api.sefaz.al.gov.br"
    && url.pathname.replace(/\/+$/, "") === "/sfz-economiza-alagoas-api/api/public"
    && !url.username && !url.password && !url.search && !url.hash;
  if (url.protocol !== "https:" && !officialHttp) return "insecure_transport";
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

// Only fixed diagnostic codes are logged; never raw messages, bodies or headers.
function networkDiagnostic(error: unknown) {
  const value = error && typeof error === "object" ? error as { name?: unknown; code?: unknown; cause?: unknown } : {};
  const cause = value.cause && typeof value.cause === "object" ? value.cause as { code?: unknown } : {};
  const rawCode = cause.code ?? value.code;
  const allowedCodes = ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_SOCKET", "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"];
  const causeCode = typeof rawCode === "string" && allowedCodes.includes(rawCode) ? rawCode : "UNKNOWN";
  const errorName = typeof value.name === "string" && ["Error", "TypeError", "AbortError", "TimeoutError"].includes(value.name) ? value.name : "Error";
  return { errorName, causeCode };
}


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
    const startedAt = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), NET.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        redirect: "manual",
        headers: { "Content-Type": "application/json", Accept: "application/json", appToken: token },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        console.warn("[economiza] upstream_http", { operation: op, attempt: attempt + 1, status: res.status, elapsedMs: Date.now() - startedAt });
      }
      if (res.status >= 300 && res.status < 400) {
        clearTimeout(timer);
        await res.body?.cancel();
        return fail("api_error", "O serviço retornou um redirecionamento não permitido.");
      }
      const text = await res.text();
      clearTimeout(timer);
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
        return fail("unavailable", `A API respondeu com HTTP ${res.status}.`);
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
      const isAbort = ctrl.signal.aborted || (e != null && typeof e === "object" && "name" in e && e.name === "AbortError");
      const diagnostic = networkDiagnostic(e);
      console.warn("[economiza] upstream_exception", { operation: op, attempt: attempt + 1, elapsedMs: Date.now() - startedAt, ...diagnostic, timedOut: isAbort });
      if (isAbort) {
        return fail("timeout");
      }
      if (attempt < NET.retries) {
        await new Promise((r) => setTimeout(r, NET.retryDelayMs));
        continue;
      }
      return fail("unavailable", `Falha de conexão com a API (${diagnostic.causeCode}).`);
    }
  }
  return fail("unavailable");
}
