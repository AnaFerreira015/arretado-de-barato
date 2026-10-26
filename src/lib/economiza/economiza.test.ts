import { describe, expect, it, vi } from "vitest";
import { validateFuelQuery, validateProductQuery, type ProductQuery } from "./validation";
import { adaptPage } from "./adapter";
import { computeBasket, equivalenceOf } from "./compare";
import { formatBRL, formatDateTime, formatFuelBRL } from "./format";
import { apiStatus, cacheKey } from "./proxy.server";

const base: ProductQuery = { descricao: "LEITE", place: { tipo: "municipio", codigoIBGE: 2704302 }, dias: 7, pagina: 1, registrosPorPagina: 100 };

describe("configured access", () => {
  it("requires a secure endpoint even after a token has been saved", () => {
    vi.stubEnv("ECONOMIZA_APP_TOKEN", "test-fixture-not-a-credential");
    try {
      vi.stubEnv("ECONOMIZA_API_BASE_URL", "");
      expect(apiStatus()).toBe("endpoint_not_configured");
      vi.stubEnv("ECONOMIZA_API_BASE_URL", "http://example.invalid/");
      expect(apiStatus()).toBe("insecure_transport");
      vi.stubEnv("ECONOMIZA_API_BASE_URL", "https://example.invalid/");
      expect(apiStatus()).toBe("ready");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("product validation", () => {
  it("permits product search only after required product and establishment are valid", () => {
    expect(validateProductQuery({ ...base, descricao: "", place: { tipo: "municipio", codigoIBGE: 0 } }).ok).toBe(false);
    expect(validateProductQuery({ ...base, descricao: "arroz", place: { tipo: "municipio", codigoIBGE: 0 } }).ok).toBe(false);
    expect(validateProductQuery({ ...base, descricao: "arroz" }).ok).toBe(true);
  });
  it("permits fuel search only after required fuel and establishment are valid", () => {
    const q = { tipoCombustivel: 0, place: base.place, dias: 7, pagina: 1, registrosPorPagina: 100 };
    expect(validateFuelQuery(q).ok).toBe(false);
    expect(validateFuelQuery({ ...q, tipoCombustivel: 1, place: { tipo: "municipio", codigoIBGE: 0 } }).ok).toBe(false);
    expect(validateFuelQuery({ ...q, tipoCombustivel: 1 }).ok).toBe(true);
  });
  it("rejects gtin and descricao together", () => {
    expect(validateProductQuery({ ...base, gtin: "78912345" }).ok).toBe(false);
  });
  it("rejects missing product criteria", () => {
    expect(validateProductQuery({ ...base, descricao: "" }).ok).toBe(false);
  });
  it("descricao must be 3-50 chars", () => {
    expect(validateProductQuery({ ...base, descricao: "ab" }).ok).toBe(false);
    expect(validateProductQuery({ ...base, descricao: "a".repeat(51) }).ok).toBe(false);
  });
  it("gtin lengths 8/12/13/14 and keeps leading zeros as string", () => {
    expect(validateProductQuery({ ...base, descricao: undefined, gtin: "1234567890" }).ok).toBe(false);
    const v = validateProductQuery({ ...base, descricao: undefined, gtin: "00012345678905" });
    expect(v.ok && v.body.produto.gtin).toBe("00012345678905");
  });
  it("ncm/gpc only with descricao; gpc must be from Anexo III", () => {
    expect(validateProductQuery({ ...base, descricao: undefined, gtin: "78912345", gpc: "50000000" }).ok).toBe(false);
    expect(validateProductQuery({ ...base, gpc: "12345678" }).ok).toBe(false);
    expect(validateProductQuery({ ...base, gpc: "50000000" }).ok).toBe(true);
  });
  it("establishment: municipio must be in Anexo II, cnpj 8 or 14, radius 1-15", () => {
    expect(validateProductQuery({ ...base, place: { tipo: "municipio", codigoIBGE: 2611606 } }).ok).toBe(false);
    expect(validateProductQuery({ ...base, place: { tipo: "individual", cnpj: "1234567890" } }).ok).toBe(false);
    const c = validateProductQuery({ ...base, place: { tipo: "individual", cnpj: "01234567" } });
    expect(c.ok && c.body.estabelecimento).toEqual({ individual: { cnpj: "01234567" } });
    expect(validateProductQuery({ ...base, place: { tipo: "geolocalizacao", latitude: -9.6, longitude: -35.7, raio: 16 } }).ok).toBe(false);
    expect(validateProductQuery({ ...base, place: { tipo: "geolocalizacao", latitude: -9.6, longitude: -35.7, raio: 15 } }).ok).toBe(true);
  });
  it("only one establishment criterion in the body", () => {
    const v = validateProductQuery(base);
    expect(v.ok && Object.keys(v.body.estabelecimento)).toEqual(["municipio"]);
  });
  it("dias 1-10, pagina 1-9999, registros 50-5000", () => {
    expect(validateProductQuery({ ...base, dias: 11 }).ok).toBe(false);
    expect(validateProductQuery({ ...base, dias: 0 }).ok).toBe(false);
    expect(validateProductQuery({ ...base, pagina: 10000 }).ok).toBe(false);
    expect(validateProductQuery({ ...base, registrosPorPagina: 49 }).ok).toBe(false);
    expect(validateProductQuery({ ...base, registrosPorPagina: 5001 }).ok).toBe(false);
  });
  it("fuel type 1-6", () => {
    const q = { tipoCombustivel: 7, place: base.place, dias: 7, pagina: 1, registrosPorPagina: 100 };
    expect(validateFuelQuery(q).ok).toBe(false);
    expect(validateFuelQuery({ ...q, tipoCombustivel: 6 }).ok).toBe(true);
  });
});

const rec = (over: Record<string, unknown> = {}, store: Record<string, unknown> = {}) => ({
  produto: { codigo: "1", descricao: "LEITE 1L", gtin: "07894600011622", unidadeMedida: "UN", gpc: 0,
    venda: { dataVenda: "2024-01-10T13:51:47Z", valorDeclarado: 1.65, valorVenda: 1.57 }, ...over },
  estabelecimento: { cnpj: "01234567000100", razaoSocial: "RAZAO", nomeFantasia: "", "endereço": { bairro: "FAROL", latitude: 0, longitude: 0 }, ...store },
});

describe("adapter", () => {
  it("accepts 'endereço', 'totalPaginas ' and falls back to razaoSocial", () => {
    const p = adaptPage({ totalRegistros: 1, "totalPaginas ": 3, pagina: 1, ultimaPagina: false, conteudo: [rec()] }, "produto");
    expect(p.totalPaginas).toBe(3);
    expect(p.items[0]!.store.nome).toBe("RAZAO");
    expect(p.items[0]!.store.bairro).toBe("FAROL");
    expect(p.items[0]!.store.lat).toBeNull();
    expect(p.items[0]!.gtin).toBe("07894600011622");
    expect(p.items[0]!.gpc).toBeNull();
    expect(p.ultimaPagina).toBe(false);
  });
  it("drops records without a valid price and counts them", () => {
    const p = adaptPage({ conteudo: [rec({ venda: { dataVenda: "2024-01-10T13:51:47Z", valorVenda: null } }), rec()] }, "produto");
    expect(p.items).toHaveLength(1);
    expect(p.invalidCount).toBe(1);
  });
  it("throws on unexpected shape", () => {
    expect(() => adaptPage({ foo: 1 }, "produto")).toThrow();
  });
});

describe("format", () => {
  it("converts UTC to America/Maceio (UTC-3)", () => {
    expect(formatDateTime("2024-01-10T13:51:47Z")).toBe("10/01/2024 às 10:51");
  });
  it("formats BRL and keeps 3 decimals for fuel", () => {
    expect(formatBRL(1.57).replace(/\s/g, " ")).toBe("R$ 1,57");
    expect(formatFuelBRL(5.899).replace(/\s/g, " ")).toBe("R$ 5,899");
  });
});

describe("comparison and basket", () => {
  const page = adaptPage({ conteudo: [rec(), rec({ codigo: "2", valorVenda: 1 }, { cnpj: "999" })] }, "produto");
  it("same GTIN is equivalent; different GTIN is not", () => {
    expect(equivalenceOf(page.items)).toBe("same-gtin");
    const other = adaptPage({ conteudo: [rec({ gtin: "78900000" })] }, "produto").items[0];
    expect(equivalenceOf([page.items[0]!, other!])).toBe("unconfirmed");
  });
  it("missing items are not counted as zero and block savings", () => {
    const r = computeBasket([
      { id: "a", quantidade: 2, records: page.items },
      { id: "b", quantidade: 1, records: [] },
    ]);
    expect(r.pricedItems).toBe(1);
    expect(r.totalItems).toBe(2);
    expect(r.missingItemIds).toEqual(["b"]);
    expect(r.splitTotal).toBe(3.14);
    expect(r.bestCompleteStore).toBeNull();
    expect(r.splitSavings).toBeNull();
  });
});

describe("cache key", () => {
  it("includes every criterion regardless of key order", () => {
    expect(cacheKey("produto/pesquisa", { a: 1, b: { c: 2, d: 3 } })).toBe(cacheKey("produto/pesquisa", { b: { d: 3, c: 2 }, a: 1 }));
    expect(cacheKey("produto/pesquisa", { dias: 7 })).not.toBe(cacheKey("produto/pesquisa", { dias: 6 }));
  });
});
