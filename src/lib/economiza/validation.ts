// Shared validation used by both the browser form and the server proxy.
// Builds the exact request body documented in the SEFAZ/AL manual.
import { GPC_CODES, LIMITS, MUNICIPIO_CODES } from "./constants";

export type Place =
  | { tipo: "municipio"; codigoIBGE: number }
  | { tipo: "geolocalizacao"; latitude: number; longitude: number; raio: number }
  | { tipo: "individual"; cnpj: string };

export type ProductQuery = {
  gtin?: string | undefined;
  descricao?: string | undefined;
  ncm?: string | undefined;
  gpc?: string | undefined;
  place: Place;
  dias: number;
  pagina: number;
  registrosPorPagina: number;
};

export type FuelQuery = {
  tipoCombustivel: number;
  place: Place;
  dias: number;
  pagina: number;
  registrosPorPagina: number;
};

export type FieldKey =
  | "termo" | "ncm" | "gpc" | "place" | "municipio" | "geolocalizacao" | "raio" | "cnpj"
  | "dias" | "pagina" | "registrosPorPagina" | "tipoCombustivel";
export type FieldErrors = Partial<Record<FieldKey, string>>;
export type Validated<T> = { ok: true; body: T } | { ok: false; errors: FieldErrors };

const onlyDigits = (s: string) => /^\d+$/.test(s);
const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

export function validateGtin(raw: string): string | null {
  const v = raw.trim();
  if (!onlyDigits(v)) return "Use apenas números no código de barras.";
  if (!(LIMITS.gtinLengths as readonly number[]).includes(v.length))
    return "O código de barras deve ter 8, 12, 13 ou 14 números.";
  return null;
}

export function validateDescricao(raw: string): string | null {
  const v = raw.trim();
  if (v.length < LIMITS.descricaoMin) return "Digite pelo menos 3 letras.";
  if (v.length > LIMITS.descricaoMax) return "Use no máximo 50 caracteres.";
  return null;
}

export function validateCnpj(raw: string): string | null {
  const v = raw.trim();
  if (!onlyDigits(v)) return "Use apenas números no CNPJ, sem pontos ou barras.";
  if (!(LIMITS.cnpjLengths as readonly number[]).includes(v.length))
    return "Informe os 8 primeiros números do CNPJ ou o CNPJ completo com 14 números.";
  return null;
}

function validatePlace(place: Place | undefined, errors: FieldErrors) {
  if (!place) {
    errors.place = "Escolha um município, use sua localização ou informe um CNPJ.";
    return;
  }
  const keys = Object.keys(place).filter((k) => k !== "tipo");
  if (place.tipo === "municipio") {
    if (keys.length !== 1 || !isInt(place.codigoIBGE) || !MUNICIPIO_CODES.has(place.codigoIBGE))
      errors.municipio = "Escolha um município de Alagoas da lista.";
  } else if (place.tipo === "geolocalizacao") {
    const { latitude, longitude, raio } = place;
    if (
      typeof latitude !== "number" || typeof longitude !== "number" ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180
    )
      errors.geolocalizacao = "Não foi possível obter sua localização. Escolha um município.";
    if (!isInt(raio) || raio < LIMITS.raioMin || raio > LIMITS.raioMax)
      errors.raio = "O raio deve ficar entre 1 e 15 km.";
  } else if (place.tipo === "individual") {
    const e = typeof place.cnpj === "string" ? validateCnpj(place.cnpj) : "Informe o CNPJ.";
    if (e) errors.cnpj = e;
  } else {
    errors.place = "Critério de estabelecimento inválido.";
  }
}

function validatePaging(q: { dias: number; pagina: number; registrosPorPagina: number }, errors: FieldErrors) {
  if (!isInt(q.dias) || q.dias < LIMITS.diasMin || q.dias > LIMITS.diasMax)
    errors.dias = "O período deve ficar entre 1 e 10 dias.";
  if (!isInt(q.pagina) || q.pagina < LIMITS.paginaMin || q.pagina > LIMITS.paginaMax)
    errors.pagina = "Página fora do intervalo permitido.";
  if (!isInt(q.registrosPorPagina) || q.registrosPorPagina < LIMITS.registrosMin || q.registrosPorPagina > LIMITS.registrosMax)
    errors.registrosPorPagina = "Quantidade por página fora do intervalo permitido.";
}

export function placeToBody(place: Place) {
  switch (place.tipo) {
    case "municipio":
      return { municipio: { codigoIBGE: place.codigoIBGE } };
    case "geolocalizacao":
      return { geolocalizacao: { latitude: place.latitude, longitude: place.longitude, raio: place.raio } };
    case "individual":
      return { individual: { cnpj: place.cnpj.trim() } };
  }
}

export type ProductBody = {
  produto: { gtin?: string | undefined; descricao?: string | undefined; ncm?: string | undefined; gpc?: string | undefined };
  estabelecimento: ReturnType<typeof placeToBody>;
  dias: number;
  pagina: number;
  registrosPorPagina: number;
};

export function validateProductQuery(q: ProductQuery): Validated<ProductBody> {
  const errors: FieldErrors = {};
  const gtin = q.gtin?.trim() || undefined;
  const descricao = q.descricao?.trim() || undefined;
  const ncm = q.ncm?.trim() || undefined;
  const gpc = q.gpc?.trim() || undefined;

  if (!gtin && !descricao) errors.termo = "Digite o nome do produto ou o código de barras.";
  else if (gtin && descricao) errors.termo = "Pesquise por nome ou por código de barras, não pelos dois.";
  else if (gtin) {
    const e = validateGtin(gtin);
    if (e) errors.termo = e;
  } else if (descricao) {
    const e = validateDescricao(descricao);
    if (e) errors.termo = e;
  }
  if (ncm) {
    if (!descricao) errors.ncm = "O NCM só pode ser usado na busca por nome.";
    else if (!/^\d{8}$/.test(ncm)) errors.ncm = "O NCM tem 8 números.";
  }
  if (gpc) {
    if (!descricao) errors.gpc = "A categoria só pode ser usada na busca por nome.";
    else if (!GPC_CODES.has(gpc)) errors.gpc = "Categoria inválida.";
  }
  validatePlace(q.place, errors);
  validatePaging(q, errors);
  if (Object.keys(errors).length) return { ok: false, errors };

  const produto: ProductBody["produto"] = gtin ? { gtin } : { descricao };
  if (descricao && ncm) produto.ncm = ncm;
  if (descricao && gpc) produto.gpc = gpc;
  return {
    ok: true,
    body: {
      produto,
      estabelecimento: placeToBody(q.place),
      dias: q.dias,
      pagina: q.pagina,
      registrosPorPagina: q.registrosPorPagina,
    },
  };
}

export type FuelBody = {
  produto: { tipoCombustivel: number };
  estabelecimento: ReturnType<typeof placeToBody>;
  dias: number;
  pagina: number;
  registrosPorPagina: number;
};

export function validateFuelQuery(q: FuelQuery): Validated<FuelBody> {
  const errors: FieldErrors = {};
  if (!isInt(q.tipoCombustivel) || q.tipoCombustivel < 1 || q.tipoCombustivel > 6)
    errors.tipoCombustivel = "Escolha um tipo de combustível.";
  validatePlace(q.place, errors);
  validatePaging(q, errors);
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    body: {
      produto: { tipoCombustivel: q.tipoCombustivel },
      estabelecimento: placeToBody(q.place),
      dias: q.dias,
      pagina: q.pagina,
      registrosPorPagina: q.registrosPorPagina,
    },
  };
}
