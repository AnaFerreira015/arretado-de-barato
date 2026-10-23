// In-memory state for the search screens, kept while navigating so filters and results survive "back".
import { createStore } from "@/lib/store";
import { LIMITS } from "./constants";
import { createSearchStore } from "./useSearch";
import type { FuelQuery, ProductQuery } from "./validation";
import type { PlaceState } from "@/components/eal/PlaceSelector";

export type ProductForm = {
  modo: "descricao" | "gtin";
  termo: string;
  cnpj: string;
  ncm: string;
  gpc: string;
  dias: number;
  place: PlaceState | null; // null = not initialised yet (reads prefs on mount)
  pendingRun: boolean;
  pendingGeo: boolean;
};

export const productFormStore = createStore<ProductForm>(
  "memory",
  { modo: "descricao", termo: "", cnpj: "", ncm: "", gpc: "", dias: LIMITS.diasDefault, place: null, pendingRun: false, pendingGeo: false },
  "memory",
);
export const productSearchStore = createSearchStore<ProductQuery>();

export type FuelForm = {
  tipo: number | null;
  cnpj: string;
  dias: number;
  place: PlaceState | null;
  pendingRun: boolean;
  pendingGeo: boolean;
  quantidade: string;
};
export const fuelFormStore = createStore<FuelForm>(
  "memory",
  { tipo: null, cnpj: "", dias: LIMITS.diasDefault, place: null, pendingRun: false, pendingGeo: false, quantidade: "" },
  "memory",
);
export const fuelSearchStore = createSearchStore<FuelQuery>();

import type { Place } from "./validation";
import type { SavedPlace } from "@/lib/store";
/** Saved favorites never keep coordinates. */
export function savedPlaceOf(p: Place): SavedPlace {
  if (p.tipo === "geolocalizacao") return { tipo: "geolocalizacao", raio: p.raio };
  if (p.tipo === "individual") return { tipo: "individual", cnpj: p.cnpj };
  return { tipo: "municipio", codigoIBGE: p.codigoIBGE };
}
