import { createServerFn } from "@tanstack/react-start";
import { MESSAGES } from "./constants";
import { adaptPage } from "./adapter";
import {
  validateFuelQuery,
  validateProductQuery,
  type FieldErrors,
  type FuelQuery,
  type ProductQuery,
} from "./validation";
import type { SearchPage } from "./adapter";

export type SearchResponse =
  | { ok: true; page: SearchPage; fetchedAt: string; cached: boolean; demo: boolean }
  | { ok: false; code: string; message: string; detail?: string | undefined; errors?: FieldErrors };

type In<T> = { query: T; demo: boolean };

const pass = <T,>(input: unknown) => input as In<T>;

export const getApiStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { apiStatus } = await import("./proxy.server");
  return { status: apiStatus() };
});

export const searchProducts = createServerFn({ method: "POST" })
  .inputValidator((i: In<ProductQuery>) => pass<ProductQuery>(i))
  .handler(async ({ data }): Promise<SearchResponse> => {
    const v = validateProductQuery(data.query);
    if (!v.ok) return { ok: false, code: "validation", message: MESSAGES.validation, errors: v.errors };
    if (data.demo === true) {
      const { demoProducts } = await import("./demo");
      return { ok: true, page: adaptPage(demoProducts(v.body), "produto"), fetchedAt: new Date().toISOString(), cached: false, demo: true };
    }
    const { callApi } = await import("./proxy.server");
    return callApi("produto/pesquisa", v.body, "produto");
  });

export const searchFuel = createServerFn({ method: "POST" })
  .inputValidator((i: In<FuelQuery>) => pass<FuelQuery>(i))
  .handler(async ({ data }): Promise<SearchResponse> => {
    const v = validateFuelQuery(data.query);
    if (!v.ok) return { ok: false, code: "validation", message: MESSAGES.validation, errors: v.errors };
    if (data.demo === true) {
      const { demoFuel } = await import("./demo");
      return { ok: true, page: adaptPage(demoFuel(v.body), "combustivel"), fetchedAt: new Date().toISOString(), cached: false, demo: true };
    }
    const { callApi } = await import("./proxy.server");
    return callApi("combustivel/pesquisa", v.body, "combustivel");
  });
