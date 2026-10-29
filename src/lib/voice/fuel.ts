import type { SaleRecord } from "@/lib/economiza/adapter";
import { MUNICIPIOS } from "@/lib/economiza/constants";
import { formatBRL, formatFuelBRL } from "@/lib/economiza/format";
import { normalize } from "./intent";

const aliases: Record<string, number> = {
  "gasolina comum": 1,
  "gasolina aditivada": 2,
  etanol: 3,
  alcool: 3,
  "diesel comum": 4,
  "diesel s500": 4,
  "diesel s 500": 4,
  "diesel aditivado": 5,
  "diesel s10": 5,
  "diesel s 10": 5,
  "diesel aditivado (s10)": 5,
  gnv: 6,
  "gas natural veicular": 6,
};
export function parseFuelRequest(
  text: string,
  fuelMode = false,
): { tipo: number | null; municipio: string | null } | null {
  const clean = normalize(text)
    .replace(/^(?:buscar|pesquisar|procurar)\s+/, "")
    .replace(/[.!?]+$/, "");
  const [raw, place] = clean.split(/\s+em\s+/);
  const name = (raw ?? "").replace(/\s+mais\s+barat[oa]$/, "").trim();
  if (name === "alcool" && !fuelMode) return null;
  const tipo = aliases[name] ?? null;
  if (!tipo && !/^(?:gasolina|diesel|etanol|gnv|gas natural veicular)(?:\s|$)/.test(name))
    return null;
  return { tipo, municipio: MUNICIPIOS.find((m) => normalize(m.nome) === place)?.nome ?? null };
}
function unit(record: SaleRecord) {
  const u = normalize(record.unidade).replace(/³/g, "3");
  return /^(l|lt|lts|litro|litros)$/.test(u)
    ? "litro"
    : /^(m3|m\^3)$/.test(u)
      ? "metro cúbico"
      : null;
}
export function rankFuelRecords(records: SaleRecord[], tipo: number): SaleRecord[] {
  const expected = tipo === 6 ? "metro cúbico" : "litro";
  return [
    ...new Map(
      records.filter((r) => r.kind === "combustivel" && unit(r) === expected).map((r) => [r.id, r]),
    ).values(),
  ].sort((a, b) => a.valorVenda - b.valorVenda || a.id.localeCompare(b.id));
}
export function voicePrice(record: SaleRecord): string {
  return record.kind === "combustivel"
    ? `${formatFuelBRL(record.valorVenda)} por ${unit(record) ?? record.unidade}`
    : formatBRL(record.valorVenda);
}
