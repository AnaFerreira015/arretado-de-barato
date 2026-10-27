import { useCallback, useRef } from "react";
import { createStore, prefsStore } from "@/lib/store";
import type { SaleRecord, SearchPage } from "./adapter";
import type { SearchResponse } from "./api.functions";
import type { FieldErrors, Place } from "./validation";
import { haversineKm } from "./format";
import type { PlaceState } from "@/components/eal/PlaceSelector";

export type SearchState<Q> = {
  status: "idle" | "loading" | "loadingMore" | "success" | "error";
  query: Q | null;
  items: SaleRecord[];
  meta: Omit<SearchPage, "items" | "invalidCount"> | null;
  invalidCount: number;
  examinedCount: number;
  fetchedAt: string | null;
  cached: boolean;
  demo: boolean;
  origin: { lat: number; lng: number } | null;
  error: { message: string; detail?: string | undefined; errors?: FieldErrors | undefined } | null;
};

const empty = <Q,>(): SearchState<Q> => ({
  status: "idle", query: null, items: [], meta: null, invalidCount: 0, examinedCount: 0, fetchedAt: null,
  cached: false, demo: false, origin: null, error: null,
});

export function createSearchStore<Q>() {
  return createStore<SearchState<Q>>("memory", empty<Q>(), "memory");
}

export function toPlace(p: PlaceState, cnpj: string): Place | undefined {
  if (cnpj.trim()) return { tipo: "individual", cnpj: cnpj.trim() };
  if (p.mode === "geo" && p.coords) return { tipo: "geolocalizacao", latitude: p.coords.lat, longitude: p.coords.lng, raio: p.raio };
  if (p.municipio) return { tipo: "municipio", codigoIBGE: p.municipio };
  return undefined;
}

/** Runs searches; ignores responses from superseded requests. */
export function useSearchRunner<Q extends { pagina: number; place: Place }>(
  store: ReturnType<typeof createSearchStore<Q>>,
  fn: (args: { data: { query: Q; demo: boolean } }) => Promise<SearchResponse>,
) {
  const reqId = useRef(0);
  const run = useCallback(
    async (query: Q, mode: "new" | "more") => {
      const id = ++reqId.current;
      const demo = prefsStore.get().demo;
      const origin = query.place.tipo === "geolocalizacao" ? { lat: query.place.latitude, lng: query.place.longitude } : null;
      store.set((s) => (mode === "new" ? { ...empty<Q>(), status: "loading", query, origin } : { ...s, status: "loadingMore", error: null }));
      let res: SearchResponse;
      try {
        res = await fn({ data: { query, demo } });
      } catch {
        res = { ok: false, code: "unavailable", message: "Não foi possível falar com o servidor do aplicativo. Verifique sua internet." };
      }
      if (id !== reqId.current) return; // stale
      if (!res.ok) {
        store.set((s) => ({ ...s, status: "error", error: { message: res.message, detail: res.detail, errors: res.errors } }));
        return;
      }
      const { items, invalidCount, ...meta } = res.page;
      store.set((s) => {
        const seen = new Set(mode === "more" ? s.items.map((i) => i.id) : []);
        const merged = mode === "more" ? [...s.items, ...items.filter((i) => !seen.has(i.id))] : items;
        return {
          ...s, status: "success", query, items: merged, meta,
          invalidCount: (mode === "more" ? s.invalidCount : 0) + invalidCount,
          examinedCount: (mode === "more" ? s.examinedCount : 0) + meta.registrosPagina,
          fetchedAt: res.fetchedAt, cached: res.cached, demo: res.demo, error: null,
        };
      });
    },
    [fn, store],
  );
  const cancel = useCallback(() => {
    reqId.current++;
    store.set((s) => ({ ...s, status: s.items.length ? "success" : "idle" }));
  }, [store]);
  return { run, cancel };
}

export type SortKey = "preco" | "data" | "distancia";

export function distanceFor(r: SaleRecord, origin: { lat: number; lng: number } | null) {
  if (!origin || r.store.lat == null || r.store.lng == null) return null;
  return haversineKm(origin, { lat: r.store.lat, lng: r.store.lng });
}

export function sortRecords(items: SaleRecord[], key: SortKey, origin: { lat: number; lng: number } | null) {
  const arr = [...items];
  if (key === "preco") arr.sort((a, b) => a.valorVenda - b.valorVenda);
  else if (key === "data") arr.sort((a, b) => Date.parse(b.dataVendaUtc) - Date.parse(a.dataVendaUtc));
  else
    arr.sort((a, b) => {
      const da = distanceFor(a, origin);
      const db = distanceFor(b, origin);
      if (da == null) return db == null ? 0 : 1;
      if (db == null) return -1;
      return da - db;
    });
  return arr;
}
