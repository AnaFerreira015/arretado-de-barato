import { describe, expect, it } from "vitest";
import { matchesVoiceRecord, rankVoiceRecords, describeRecord } from "./results";
import { sale } from "./test-fixtures";

const intent = { descricao: "coca", embalagem: "2 litros", variante: "zero" };
describe("resultados do assistente", () => {
  it("exige palavra inteira, tamanho e variante", () => {
    expect(matchesVoiceRecord(sale("COCA COLA ZERO 2L"), intent)).toBe(true);
    expect(matchesVoiceRecord(sale("PAÇOCA ZERO 2L"), intent)).toBe(false);
    expect(matchesVoiceRecord(sale("COCA COLA ZERO 350ML"), intent)).toBe(false);
    expect(matchesVoiceRecord(sale("COCA COLA 2L"), intent)).toBe(false);
    expect(matchesVoiceRecord(sale("COCA COLA ZERO"), intent)).toBe(false);
  });
  it("não confunde multipack ou descrições conflitantes com embalagem simples", () => {
    expect(matchesVoiceRecord(sale("COCA ZERO 6x2L"), intent)).toBe(false);
    expect(matchesVoiceRecord(sale("PACK COCA ZERO 2L 6 UN"), intent)).toBe(false);
    expect(
      matchesVoiceRecord({ ...sale("COCA ZERO 350ML"), descricaoSefaz: "COCA ZERO 2L" }, intent),
    ).toBe(false);
  });
  it("rejeita pacotes de doze unidades e tamanho ambíguo mesmo com descrição secundária exata", () => {
    expect(matchesVoiceRecord(sale("COCA ZERO 2L 12 UN"), intent)).toBe(false);
    expect(matchesVoiceRecord(sale("COCA ZERO 2L C/12"), intent)).toBe(false);
    expect(
      matchesVoiceRecord(
        { ...sale("COCA ZERO 350ML OU 2L"), descricaoSefaz: "COCA ZERO 2L" },
        intent,
      ),
    ).toBe(false);
  });
  it("filtra antes de ordenar e deduplica registros", () => {
    const a = sale("COCA ZERO 2L", 8, "a");
    const b = sale("COCA ZERO 2000ML", 6, "b");
    expect(
      rankVoiceRecords([a, sale("COCA ZERO 350ML", 2), b, a], intent).map((r) => r.valorVenda),
    ).toEqual([6, 8]);
  });
  it("fala dados reais e sinaliza demonstração", () => {
    const text = describeRecord(sale("COCA ZERO 2L", 7.5), 1, true);
    expect(text).toContain("demonstrativos");
    expect(text).toContain("7,50");
    expect(text).toContain("Mercado Teste");
    expect(text).toContain("28/10/2026");
    expect(text).toContain("Maceió");
  });
});
