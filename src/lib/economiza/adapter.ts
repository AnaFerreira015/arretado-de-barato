// Single place that maps raw SEFAZ/AL responses to the app's model.
// Compatibility decisions (documented in README):
// - The manual's example uses "endereço" while the table says "endereco": accept both.
// - The example has a key "totalPaginas " (trailing space): accept both.
// - gtin/ncm/cnpj/cep/codigoIBGE may arrive as number or string: always keep as string,
//   never pad or strip (leading zeros cannot be recovered if the API sends numbers).
// - gpc "0" means "not classified" -> null.
// - Invalid/zero coordinates -> null.

export type Store = {
  cnpj: string;
  nome: string; // nomeFantasia with razaoSocial fallback
  razaoSocial: string;
  telefone: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cep: string | null;
  codigoIBGE: string | null;
  municipio: string | null;
  lat: number | null;
  lng: number | null;
};

export type SaleRecord = {
  id: string;
  kind: "produto" | "combustivel";
  codigo: string;
  descricao: string;
  descricaoSefaz: string | null;
  gtin: string | null;
  ncm: string | null;
  gpc: string | null;
  unidade: string;
  dataVendaUtc: string; // original value as returned
  valorDeclarado: number | null;
  valorVenda: number;
  store: Store;
};

export type SearchPage = {
  totalRegistros: number;
  totalPaginas: number;
  pagina: number;
  registrosPorPagina: number;
  registrosPagina: number;
  primeiraPagina: boolean;
  ultimaPagina: boolean;
  items: SaleRecord[];
  invalidCount: number;
};

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
};
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : null);

function coord(lat: unknown, lng: unknown): [number | null, number | null] {
  const a = num(lat);
  const b = num(lng);
  if (a == null || b == null || (a === 0 && b === 0) || Math.abs(a) > 90 || Math.abs(b) > 180) return [null, null];
  return [a, b];
}

function adaptStore(raw: unknown): Store | null {
  const e = obj(raw);
  if (!e) return null;
  const end = obj(e["endereco"]) ?? obj(e["endereço"]) ?? {};
  const [lat, lng] = coord(end["latitude"], end["longitude"]);
  const razao = str(e["razaoSocial"]) ?? "";
  const fantasia = str(e["nomeFantasia"]);
  const cnpj = str(e["cnpj"]) ?? "";
  return {
    cnpj,
    nome: fantasia ?? (razao || "Estabelecimento sem nome informado"),
    razaoSocial: razao,
    telefone: str(e["telefone"]),
    logradouro: str(end["nomeLogradouro"]),
    numero: str(end["numeroImovel"]),
    bairro: str(end["bairro"]),
    cep: str(end["cep"]),
    codigoIBGE: str(end["codigoIBGE"]),
    municipio: str(end["municipio"]),
    lat,
    lng,
  };
}

export function adaptRecord(raw: unknown, kind: SaleRecord["kind"]): SaleRecord | null {
  const r = obj(raw);
  if (!r) return null;
  const p = obj(r["produto"]);
  const venda = p ? obj(p["venda"]) : null;
  const store = adaptStore(r["estabelecimento"]);
  if (!p || !venda || !store) return null;
  const valorVenda = num(venda["valorVenda"]);
  const dataVenda = str(venda["dataVenda"]);
  const descricao = str(p["descricao"]);
  if (valorVenda == null || valorVenda <= 0 || !dataVenda || Number.isNaN(Date.parse(dataVenda)) || !descricao)
    return null;
  const gtin = str(p["gtin"]);
  const gpc = str(p["gpc"]);
  const codigo = str(p["codigo"]) ?? "";
  return {
    id: [kind, store.cnpj, codigo, gtin ?? "", dataVenda, valorVenda].join("|"),
    kind,
    codigo,
    descricao,
    descricaoSefaz: str(p["descricaoSefaz"]),
    gtin: gtin && gtin !== "0" ? gtin : null,
    ncm: str(p["ncm"]),
    gpc: gpc && gpc !== "0" ? gpc : null,
    unidade: str(p["unidadeMedida"]) ?? "—",
    dataVendaUtc: dataVenda,
    valorDeclarado: num(venda["valorDeclarado"]),
    valorVenda,
    store,
  };
}

export class UnexpectedResponseError extends Error {}

export function adaptPage(raw: unknown, kind: SaleRecord["kind"]): SearchPage {
  const r = obj(raw);
  if (!r || !Array.isArray(r["conteudo"])) throw new UnexpectedResponseError("conteudo ausente");
  const list = r["conteudo"] as unknown[];
  const items: SaleRecord[] = [];
  let invalid = 0;
  for (const it of list) {
    const a = adaptRecord(it, kind);
    if (a) items.push(a);
    else invalid++;
  }
  const pagina = num(r["pagina"]) ?? 1;
  const totalPaginas = num(r["totalPaginas"]) ?? num(r["totalPaginas "]) ?? pagina;
  const ultima = bool(r["ultimaPagina"]) ?? pagina >= totalPaginas;
  return {
    totalRegistros: num(r["totalRegistros"]) ?? items.length,
    totalPaginas,
    pagina,
    registrosPorPagina: num(r["registrosPorPagina"]) ?? list.length,
    registrosPagina: num(r["registrosPagina"]) ?? list.length,
    primeiraPagina: bool(r["primeiraPagina"]) ?? pagina === 1,
    ultimaPagina: ultima,
    items,
    invalidCount: invalid,
  };
}

export function fullAddress(s: Store): string {
  const street = [s.logradouro, s.numero].filter(Boolean).join(", ");
  const parts = [street, s.bairro, s.municipio ? `${s.municipio} - AL` : null, s.cep ? `CEP ${formatCep(s.cep)}` : null];
  return parts.filter(Boolean).join(" · ");
}

export function formatCep(cep: string) {
  return /^\d{8}$/.test(cep) ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
}

export function mapsUrl(s: Store): string {
  if (s.lat != null && s.lng != null)
    return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
  const q = [s.logradouro, s.numero, s.bairro, s.municipio, "AL"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
