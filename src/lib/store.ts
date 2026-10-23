// Tiny persistent stores (localStorage/sessionStorage) using useSyncExternalStore.
// No account, no sync between devices.
import { useSyncExternalStore } from "react";
import type { SaleRecord } from "./economiza/adapter";

type Listener = () => void;

export function createStore<T>(key: string, initial: T, storage: "local" | "session" | "memory" = "local") {
  let value: T = initial;
  let loaded = false;
  const listeners = new Set<Listener>();
  const area = () =>
    typeof window === "undefined" || storage === "memory"
      ? null
      : storage === "local"
        ? window.localStorage
        : window.sessionStorage;

  const load = () => {
    if (loaded) return;
    loaded = true;
    try {
      const raw = area()?.getItem(key);
      if (raw) value = { ...initialIfObject(initial), ...JSON.parse(raw) } as T;
      if (raw && Array.isArray(initial)) value = JSON.parse(raw) as T;
    } catch {
      /* corrupted -> initial */
    }
  };
  const get = () => {
    if (typeof window !== "undefined") load();
    return value;
  };
  const set = (next: T | ((prev: T) => T)) => {
    load();
    value = typeof next === "function" ? (next as (p: T) => T)(value) : next;
    try {
      area()?.setItem(key, JSON.stringify(value));
    } catch {
      /* quota */
    }
    listeners.forEach((l) => l());
  };
  const reset = () => {
    try {
      area()?.removeItem(key);
    } catch {
      /* ignore */
    }
    value = initial;
    listeners.forEach((l) => l());
  };
  const subscribe = (l: Listener) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const use = () => useSyncExternalStore(subscribe, get, () => initial);
  return { get, set, reset, use, subscribe };
}

function initialIfObject<T>(v: T) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

// ---------- domain stores ----------

export type Prefs = { municipio: number | null; remember: boolean; demo: boolean };
export const prefsStore = createStore<Prefs>("eal:prefs", { municipio: null, remember: false, demo: false });

/** Saved criteria. Geolocation favorites never store coordinates: they re-ask the device. */
export type SavedPlace = { tipo: "municipio"; codigoIBGE: number } | { tipo: "individual"; cnpj: string } | { tipo: "geolocalizacao"; raio: number };

export type Favorite =
  | {
      id: string;
      kind: "produto";
      label: string;
      modo: "descricao" | "gtin";
      termo: string;
      gpc?: string;
      ncm?: string;
      place: SavedPlace;
      dias: number;
      savedAt: string;
      lastSeen?: { valor: number; at: string; loja: string };
    }
  | {
      id: string;
      kind: "combustivel";
      label: string;
      tipoCombustivel: number;
      place: SavedPlace;
      dias: number;
      savedAt: string;
    };
export const favoritesStore = createStore<Favorite[]>("eal:favorites", []);

export type ListItem = {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  observacao: string;
  comprado: boolean;
  gtin: string | null;
};
export const listStore = createStore<ListItem[]>("eal:list", []);

export const compareStore = createStore<SaleRecord[]>("eal:compare", [], "session");

export function clearDeviceData() {
  prefsStore.reset();
  favoritesStore.reset();
  listStore.reset();
  compareStore.reset();
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
