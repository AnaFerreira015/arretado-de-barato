import { afterEach, expect, it, vi } from "vitest";
import { callApi } from "./proxy.server";
import { sortRecords } from "./useSearch";
import * as format from "./format";
import { sale } from "@/lib/voice/test-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function configure() {
  vi.stubEnv("ECONOMIZA_APP_TOKEN", "test-performance");
  vi.stubEnv(
    "ECONOMIZA_API_BASE_URL",
    "https://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/",
  );
}
it("compartilha uma consulta em andamento e reutiliza o resultado no cache", async () => {
  configure();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetcher = vi.fn(async () => {
    await gate;
    return new Response(JSON.stringify({ conteudo: [], pagina: 1, totalPaginas: 1 }));
  });
  vi.stubGlobal("fetch", fetcher);
  const body = { descricao: "performance-concorrente" };
  const first = callApi("produto/pesquisa", body, "produto");
  const second = callApi("produto/pesquisa", body, "produto");
  release();
  const results = await Promise.all([first, second]);
  expect(results.every((r) => r.ok)).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(await callApi("produto/pesquisa", body, "produto")).toMatchObject({
    ok: true,
    cached: true,
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("permite uma nova tentativa depois de uma consulta compartilhada com erro", async () => {
  configure();
  const fetcher = vi.fn(async () => new Response(null, { status: 401 }));
  vi.stubGlobal("fetch", fetcher);
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const body = { descricao: "performance-falha" };
  const responses = await Promise.all([
    callApi("produto/pesquisa", body, "produto"),
    callApi("produto/pesquisa", body, "produto"),
  ]);
  expect(responses).toEqual([
    expect.objectContaining({ code: "auth" }),
    expect.objectContaining({ code: "auth" }),
  ]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await callApi("produto/pesquisa", body, "produto");
  expect(fetcher).toHaveBeenCalledTimes(2);
  warning.mockRestore();
});
it("calcula cada distância uma única vez mantendo a ordem e os itens sem coordenadas no fim", () => {
  const distance = vi.spyOn(format, "haversineKm");
  const items = Array.from({ length: 100 }, (_, i) => ({
    ...sale(`Produto ${i}`),
    store: { ...sale("x").store, lat: -9 - i / 1000, lng: -35 },
  }));
  const missing = sale("Sem coordenadas");
  const input = [missing, ...items.slice().reverse()];
  const sorted = sortRecords(input, "distancia", { lat: -9, lng: -35 });
  expect(sorted[0]).toBe(items[0]);
  expect(sorted.at(-1)).toBe(missing);
  expect(input[0]).toBe(missing);
  expect(distance).toHaveBeenCalledTimes(items.length);
});
it("não mistura consultas simultâneas de páginas diferentes", async () => {
  configure();
  const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ conteudo: [], pagina: body.pagina, totalPaginas: 2 }));
  });
  vi.stubGlobal("fetch", fetcher);
  const responses = await Promise.all(
    [1, 2].map((pagina) =>
      callApi("produto/pesquisa", { descricao: "performance-paginas", pagina }, "produto"),
    ),
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(responses.map((result) => result.ok && result.page.pagina)).toEqual([1, 2]);
});
