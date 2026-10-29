import { MUNICIPIOS } from "@/lib/economiza/constants";

export type ProductIntent = { descricao: string; embalagem: string; variante: string };
export const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim();

const commands = {
  next: ["proximo", "proximo resultado"], more: ["carregar mais", "carregar mais resultados"],
  stop: ["parar", "parar leitura", "cancelar"], repeat: ["repetir"], help: ["ajuda"],
  confirm: ["confirmar", "confirmar busca", "pesquisar"], restart: ["nova busca", "recomecar"],
  editProduct: ["corrigir", "corrigir produto"], editSize: ["corrigir embalagem"],
  editVariant: ["corrigir variante"], editPlace: ["corrigir municipio", "corrigir local"],
  editRadius: ["corrigir raio"], editDays: ["corrigir periodo"],
  location: ["usar minha localizacao"], read: ["ouvir resultados"],
} as const;
export type Command = keyof typeof commands;
export function parseCommand(text: string): Command | null {
  const cleaned = normalize(text).replace(/[.!?]+$/g, "");
  for (const [key, values] of Object.entries(commands)) {
    if ((values as readonly string[]).includes(cleaned)) return key as Command;
  }
  return null;
}

function numbers(text: string) {
  const map: Record<string, string> = { um: "1", uma: "1", dois: "2", duas: "2", tres: "3", quatro: "4", cinco: "5", seis: "6", sete: "7", oito: "8", nove: "9", dez: "10", meio: "0,5", quinhentos: "500" };
  return normalize(text).replace(/\b(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|meio|quinhentos)\b/g, (word) => map[word] ?? word);
}
const sizePattern = /(?<![\p{L}\d])\d+(?:[.,]\d+)?\s*(?:mililitros?|ml|litros?|lts?|l|quilogramas?|quilos?|kgs?|gramas?|grs?|g)(?!\p{L})/gu;
export const isMultipack = (text: string) => /\b(?:pack|kit|fardo)\b|\d\s*[x×]\s*\d|\b(?:c\/|com\s+)\d+\s*(?:un|garraf|lata)|\b[2-9]\d*\s*(?:un\b|unidades\b)/i.test(normalize(text));
export function parseSize(text: string): { amount: number; unit: "ml" | "g" } | null {
  const normalized = numbers(text);
  if (isMultipack(normalized)) return null;
  const matches = normalized.match(sizePattern);
  if (matches?.length !== 1) return null;
  const match = matches[0]!.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)!;
  const amount = Number(match[1]!.replace(",", "."));
  const unit = match[2]!;
  if (amount <= 0) return null;
  if (/^(?:mililitro|ml)/.test(unit)) return { amount, unit: "ml" };
  if (/^(?:l)/.test(unit)) return { amount: amount * 1000, unit: "ml" };
  return { amount: amount * (/^(?:k|quilo)/.test(unit) ? 1000 : 1), unit: "g" };
}

export function parseProduct(text: string): ProductIntent {
  let descricao = text.trim().replace(/^(?:buscar|pesquisar|procurar)\s+/i, "");
  const normalized = numbers(descricao);
  const size = parseSize(descricao);
  const sizeText = size ? normalized.match(sizePattern)?.[0] ?? "" : "";
  // Remove from the original text by token count only when a single explicit size was found.
  if (sizeText) descricao = descricao.replace(/(?:\s+de)?\s*(?:\d+(?:[.,]\d+)?|um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez|meio|quinhentos)\s*(?:mililitros?|ml|litros?|lts?|l|quilogramas?|quilos?|kgs?|gramas?|grs?|g)\b/iu, "");
  const variant = descricao.match(/\b(?:sem lactose|sem a[cç][uú]car|zero|integral|desnatado|tradicional)\b/iu)?.[0] ?? "";
  if (variant) descricao = descricao.replace(variant, "");
  return { descricao: descricao.replace(/\s+/g, " ").trim(), embalagem: sizeText.replace(/\s*(litros?|lts?)$/, " l"), variante: variant.toLocaleLowerCase("pt-BR") };
}

export function resolveMunicipio(text: string): number | null {
  return MUNICIPIOS.find((m) => normalize(m.nome) === normalize(text))?.codigo ?? null;
}
