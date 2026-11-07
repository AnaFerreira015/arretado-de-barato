import { expect, it } from "vitest";
import { belongsToCategory } from "./classification";
import { browseCategory } from "./browse";
import { sale } from "@/lib/voice/test-fixtures";
import { vi } from "vitest";
const animal = (description: string, ncm: string | null) => ({
  ...sale(description),
  gpc: "89000000",
  ncm,
});
it.each([
  ["TRAVESSA INOX PEIXE", "73239300"],
  ["TEMPERO PARA FRANGO", "21039021"],
  ["MIOJO NISSIN GALINHA CAIPIRA", "19023000"],
  ["PEIXE VIVO", null],
])(
  "não apresenta %s em Animais Vivos mesmo quando o GPC da origem é inconsistente",
  (description, ncm) => {
    expect(belongsToCategory(animal(description, ncm), "89000000")).toBe(false);
  },
);
it.each([
  ["GALINHA VIVA", "01059400"],
  ["PEIXE VIVO", "03011190"],
])("aceita %s com GPC, GTIN e NCM compatíveis", (description, ncm) => {
  expect(belongsToCategory(animal(description, ncm), "89000000")).toBe(true);
});
it("não infere categorias por palavras nem aceita item sem GTIN", () => {
  expect(belongsToCategory({ ...sale("SABAO"), gpc: null }, "47000000")).toBe(false);
  expect(belongsToCategory({ ...sale("SABAO"), gpc: "47000000", gtin: null }, "47000000")).toBe(
    false,
  );
});
it("a vitrine remove os exemplos relatados antes de montar os cartões", async () => {
  const records = [
    animal("TRAVESSA INOX PEIXE", "73239300"),
    animal("TEMPERO PARA FRANGO", "21039021"),
    animal("MIOJO NISSIN GALINHA CAIPIRA", "19023000"),
    animal("GALINHA VIVA", "01059400"),
  ];
  const search = vi.fn().mockResolvedValue({
    ok: true,
    fetchedAt: "2026-11-07T08:00:00Z",
    page: { items: records, ultimaPagina: true },
  });
  const page = await browseCategory(search, {
    category: "89000000",
    terms: ["galinha viva"],
    place: { tipo: "municipio", codigoIBGE: 2704302 },
    days: 7,
    demo: false,
    cursor: { page: 1, sources: [0] },
    signal: new AbortController().signal,
  });
  expect(page.items.map((r) => r.descricao)).toEqual(["GALINHA VIVA"]);
});

it.each(["TRAVESSA INOX PEIXE", "TEMPERO PARA FRANGO", "MIOJO NISSIN GALINHA CAIPIRA"])(
  "rejeita contradição explícita no nome mesmo se GPC e NCM estiverem incorretos: %s",
  (description) => {
    expect(belongsToCategory(animal(description, "01059400"), "89000000")).toBe(false);
  },
);
