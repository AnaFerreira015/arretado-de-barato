import { LIMITS, municipioNome, fuelName } from "@/lib/economiza/constants";
import type { ProductQuery, FuelQuery } from "@/lib/economiza/validation";
import { resolveMunicipio, type ProductIntent } from "./intent";

export type Stage =
  "fuel" | "product" | "size" | "variant" | "place" | "radius" | "days" | "confirm" | "results";
export type SearchMode = "produto" | "combustivel";
export type Draft = ProductIntent & {
  mode: SearchMode;
  tipoCombustivel: number | null;
  municipio: string;
  coords: { lat: number; lng: number } | null;
  raio: number;
  dias: number;
};
export const newDraft = (mode: SearchMode = "produto"): Draft => ({
  mode,
  tipoCombustivel: null,
  descricao: "",
  embalagem: "",
  variante: "",
  municipio: "",
  coords: null,
  raio: LIMITS.raioDefault,
  dias: LIMITS.diasDefault,
});
export function draftSummary(draft: Draft) {
  const place = draft.coords
    ? `sua localização atual, raio de ${draft.raio} quilômetros`
    : draft.municipio || "município ainda não escolhido";
  if (draft.mode === "combustivel")
    return `${draft.tipoCombustivel ? fuelName(draft.tipoCombustivel) : "Combustível ainda não escolhido"}; preço por ${draft.tipoCombustivel === 6 ? "metro cúbico" : "litro"}; em ${place}; últimos ${draft.dias} dias.`;
  return `${draft.descricao || "Produto ainda não escolhido"}; ${draft.embalagem || "qualquer embalagem (tamanhos podem variar)"}; ${draft.variante || "qualquer variante"}; em ${place}; últimos ${draft.dias} dias.`;
}
export function promptFor(stage: Stage, draft: Draft): string {
  switch (stage) {
    case "fuel":
      return `Qual combustível? Escolha gasolina comum, gasolina aditivada, etanol, diesel comum, diesel aditivado (S10) ou GNV.${draft.tipoCombustivel ? ` Identifiquei ${fuelName(draft.tipoCombustivel)}. Diga manter para confirmar o tipo.` : ""}`;
    case "product":
      return "Qual produto você quer pesquisar? Diga, por exemplo, buscar arroz.";
    case "size":
      return `Qual embalagem? ${draft.embalagem ? `Identifiquei ${draft.embalagem}. Diga manter, outro tamanho` : "Diga um tamanho, como 2 litros,"} ou qualquer embalagem.`;
    case "variant":
      return `Qual variante? ${draft.variante ? `Identifiquei ${draft.variante}. Diga manter, outra variante` : "Diga, por exemplo, zero,"} ou qualquer variante.`;
    case "place":
      return "Em qual município de Alagoas? Diga o nome ou use o botão Usar minha localização.";
    case "radius":
      return "Qual raio de busca? Diga um número de 1 a 15 quilômetros.";
    case "days":
      return "Quantos dias pesquisar? Diga um número de 1 a 10 dias.";
    case "confirm":
      return `Confira: ${draftSummary(draft)} Diga confirmar busca ou corrija um campo.`;
    case "results":
      return "Você pode ouvir resultados, pedir próximo resultado, carregar mais resultados ou fazer nova busca.";
  }
}
export function queryFor(draft: Draft, pagina = 1): ProductQuery | FuelQuery | null {
  const codigoIBGE = resolveMunicipio(draft.municipio);
  if (!draft.coords && codigoIBGE === null) return null;
  return {
    ...(draft.mode === "combustivel"
      ? { tipoCombustivel: draft.tipoCombustivel ?? 0 }
      : { descricao: draft.descricao.trim() }),
    place: draft.coords
      ? {
          tipo: "geolocalizacao",
          latitude: draft.coords.lat,
          longitude: draft.coords.lng,
          raio: draft.raio,
        }
      : { tipo: "municipio", codigoIBGE: codigoIBGE! },
    dias: draft.dias,
    pagina,
    registrosPorPagina: draft.coords ? LIMITS.registrosGeo : LIMITS.registrosDefault,
  };
}
export function canonicalMunicipio(text: string) {
  const code = resolveMunicipio(text);
  return code === null ? null : municipioNome(code);
}
export function guidedNumber(text: string): number {
  const names = [
    "zero",
    "um",
    "dois",
    "tres",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove",
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
  ];
  const value = text.replace(/\s*(?:quilometros?|km|dias?)\.?$/, "").trim();
  return /^\d+$/.test(value) ? Number(value) : names.indexOf(value);
}
