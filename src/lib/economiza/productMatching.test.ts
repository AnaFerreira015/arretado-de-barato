import { describe, expect, it } from "vitest";
import { adaptPage } from "./adapter";
import { filterProductPage, matchesProductName } from "./productMatching";

const record = (descricao: string, descricaoSefaz?: string) => ({
  produto: { descricao, descricaoSefaz, venda: { dataVenda: "2026-10-27T10:00:00Z", valorVenda: 5 } },
  estabelecimento: { cnpj: "123", razaoSocial: "Loja" },
});

describe("product name matching", () => {
  it("matches full words, ignoring case, accents and punctuation", () => {
    expect(matchesProductName("REFRIGERANTE COCA-COLA 2L", "coca")).toBe(true);
    expect(matchesProductName("PAÇOCA ROLHA", "coca")).toBe(false);
    expect(matchesProductName("PACOCAS", "coca")).toBe(false);
    expect(matchesProductName("COCADA", "coca")).toBe(false);
    expect(matchesProductName("CAFÉ TORRADO", "cafe")).toBe(true);
    expect(matchesProductName("COCA-COLA ZERO 2L", "coca zero")).toBe(true);
    expect(matchesProductName("COCA-COLA ORIGINAL", "coca zero")).toBe(false);
    expect(matchesProductName("qualquer produto", "---")).toBe(false);
  });
  it("keeps upstream pagination and never mutates cached records", () => {
    const page = adaptPage({ conteudo: [record("PAÇOCA"), record("REFRIG COCA", "COCA-COLA")], pagina: 1, totalPaginas: 2, totalRegistros: 100, ultimaPagina: false }, "produto");
    const filtered = filterProductPage(page, "coca");
    expect(filtered.items).toHaveLength(1);
    expect(page.items).toHaveLength(2);
    expect(filtered).toMatchObject({ pagina: 1, totalPaginas: 2, totalRegistros: 100, registrosPagina: 2, ultimaPagina: false, nameFiltered: true });
  });
  it("keeps empty filtered pages pageable and leaves barcode searches untouched", () => {
    const page = adaptPage({ conteudo: [record("PAÇOCA")], pagina: 1, totalPaginas: 2 }, "produto");
    expect(filterProductPage(page, "coca")).toMatchObject({ items: [], ultimaPagina: false });
    expect(filterProductPage(page, undefined)).toBe(page);
  });
  it("uses either description without joining words from unrelated descriptions", () => {
    const page = adaptPage({ conteudo: [record("REFRIG CC", "COCA-COLA ZERO"), record("COCA-COLA", "BEBIDA ZERO")] }, "produto");
    expect(filterProductPage(page, "coca zero").items).toHaveLength(1);
  });
});
