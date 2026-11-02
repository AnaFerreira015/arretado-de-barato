import { fuelFormStore, productFormStore } from "./searchStores";
export type SearchMode = "produto" | "combustivel";
export const searchMode = (value: unknown): SearchMode =>
  value === "combustivel" ? "combustivel" : "produto";
/** Only manual type switches copy shared filters. Deep links and favorites keep their own fields. */
export function selectSearchMode(from: SearchMode, to: SearchMode) {
  if (from === to) return;
  const source = from === "produto" ? productFormStore.get() : fuelFormStore.get();
  if (to === "produto")
    productFormStore.set((s) => ({
      ...s,
      place: source.place,
      dias: source.dias,
      pendingRun: false,
    }));
  else
    fuelFormStore.set((s) => ({ ...s, place: source.place, dias: source.dias, pendingRun: false }));
}
