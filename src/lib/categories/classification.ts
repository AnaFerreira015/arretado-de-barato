import { validateGtin } from "@/lib/economiza/validation";
import type { SaleRecord } from "@/lib/economiza/adapter";

/** Não classifica por palavras: GPC e GTIN devem vir do registro retornado pela API. */
export function belongsToCategory(record: SaleRecord, category: string): boolean {
  if (
    record.kind !== "produto" ||
    record.gpc !== category ||
    !record.gtin ||
    validateGtin(record.gtin) !== null
  )
    return false;
  if (category !== "89000000") return true;
  const description = [record.descricao, record.descricaoSefaz ?? ""]
    .join(" ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  // Contradições explícitas não são corrigidas inferindo uma nova categoria.
  if (
    /\b(?:travessa|inox|tempero|miojo|nissin|macarrao|caldo|racao|sabor|file|congelad[oa]s?|empanad[oa]s?)\b/.test(
      description,
    )
  )
    return false;
  // Guarda conservadora para Animais Vivos: capítulo NCM 01 ou posição 0301 (peixes vivos).
  // Sem NCM compatível, não afirmar que o item é um animal vivo.
  return !!record.ncm && /^(?:01\d{6}|0301\d{4})$/.test(record.ncm);
}
