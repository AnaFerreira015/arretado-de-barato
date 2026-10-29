import type { SaleRecord } from "@/lib/economiza/adapter";
import { formatBRL, formatDateTime } from "@/lib/economiza/format";
import { isMultipack, normalize, parseSize, type ProductIntent } from "./intent";

function wordsMatch(text: string, query: string) {
  const words = new Set(normalize(text).match(/[\p{L}\p{N}]+/gu) ?? []);
  return (normalize(query).match(/[\p{L}\p{N}]+/gu) ?? []).every((word) => words.has(word));
}

export function matchesVoiceRecord(record: SaleRecord, intent: ProductIntent): boolean {
  const texts = [record.descricao, record.descricaoSefaz].filter((t): t is string => !!t);
  if (!texts.some((text) => wordsMatch(text, intent.descricao) && wordsMatch(text, intent.variante))) return false;
  if (!intent.embalagem) return true;
  const wanted = parseSize(intent.embalagem);
  if (!wanted || texts.some(isMultipack)) return false;
  const sizes = texts.map(parseSize).filter((size) => size !== null);
  return sizes.length > 0 && sizes.every((size) => size.unit === wanted.unit && Math.abs(size.amount - wanted.amount) < 0.001);
}

export function rankVoiceRecords(records: SaleRecord[], intent: ProductIntent): SaleRecord[] {
  const unique = new Map(records.filter((r) => matchesVoiceRecord(r, intent)).map((r) => [r.id, r]));
  return [...unique.values()].sort((a, b) => a.valorVenda - b.valorVenda || a.id.localeCompare(b.id));
}

export function describeRecord(record: SaleRecord, index: number, demo: boolean): string {
  const address = [record.store.logradouro, record.store.numero, record.store.bairro, record.store.municipio].filter(Boolean).join(", ");
  return `${demo ? "Dados demonstrativos. " : ""}Resultado ${index}. ${record.descricaoSefaz || record.descricao}. ${formatBRL(record.valorVenda)}. ${record.store.nome}. ${address || "Endereço não informado"}. Venda registrada em ${formatDateTime(record.dataVendaUtc)}. Preço passado, sujeito a mudança; estoque não confirmado.`;
}
