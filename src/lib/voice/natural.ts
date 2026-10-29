import { MUNICIPIOS } from "@/lib/economiza/constants";
import { type Draft, type Stage } from "./flow";
import { normalize, parseProduct, parseSize } from "./intent";
import { parseFuelRequest } from "./fuel";

export const cleanSpeech = (text: string) =>
  normalize(text)
    .replace(/[.,!?;:]+$/g, "")
    .replace(/(?:,?\s+por favor|,?\s+por gentileza)$/g, "")
    .replace(/^por favor[, ]+/, "")
    .replace(/\s+/g, " ")
    .trim();
export const anyChoice = (text: string) =>
  /^(?:qualquer(?: embalagem| variante| tamanho)?|tanto faz(?: o tamanho| a embalagem| a variante)?|nao tenho preferencia|pode ser qualquer(?: um| uma)?|sem preferencia)$/.test(
    cleanSpeech(text),
  );
export const keepChoice = (text: string) =>
  /^(?:manter|isso|esse mesmo|essa mesma|pode manter|sim|ta bom|esta bom)$/.test(cleanSpeech(text));
export const affirmative = (text: string) =>
  /^(?:sim|isso|isso mesmo|ta certo|esta certo|pode sim|ok|tudo certo)$/.test(cleanSpeech(text));
export const negative = (text: string) =>
  /^(?:nao|ainda nao|nao quero|nao (?:pode |quero )?(?:buscar|pesquisar|confirmar)(?: agora)?|esta errado|nao e isso)$/.test(
    cleanSpeech(text),
  );

// Only resolve phrases whose entire meaning fits the supported local grammar.
// Unconsumed qualifiers go to the language model, never silently disappear.
export function naturalRequest(
  text: string,
  current: Draft,
  stage: Stage,
): { draft: Draft; location: boolean } | null {
  let value = cleanSpeech(text);
  if (/\b(?:nao|nem|ou|exceto|menos|ate|abaixo|acima)\b|\be\b/.test(value)) return null;
  if (/\bsem\b/.test(value.replace(/\bsem (?:lactose|acucar)\b/g, ""))) return null;
  const correction = /^(?:na verdade|melhor|troque|troca|mude|muda|corrigir)\b/.test(value);
  const request =
    /^(?:(?:eu |agora )?(?:quero|queria|gostaria de|preciso de)|(?:buscar|busque|pesquisar|pesquise|procurar|procure))\s+/.test(
      value,
    );
  value = value
    .replace(/^(?:na verdade|melhor)[, ]+/, "")
    .replace(/^(?:troque|troca|mude|muda|corrigir)(?:\s+(?:para|por))?\s+/, "")
    .replace(
      /^(?:(?:eu |agora )?(?:quero|queria|gostaria de|preciso de)|(?:buscar|busque|pesquisar|pesquise|procurar|procure))\s+/,
      "",
    )
    .replace(/^(?:encontrar|comprar|buscar|pesquisar|procurar)\s+/, "")
    .replace(/^pode ser\s+/, "");
  let municipio: string | undefined;
  const cities = [...MUNICIPIOS].sort((a, b) => b.nome.length - a.nome.length);
  for (const city of cities) {
    const name = normalize(city.nome);
    if (value === name || value.endsWith(` em ${name}`) || value === `em ${name}`) {
      municipio = city.nome;
      value = value === name ? "" : value.slice(0, -`em ${name}`.length).trim();
      break;
    }
  }
  const location = /(?:perto de mim|aqui perto|nas proximidades|na minha localizacao)$/.test(value);
  value = value
    .replace(/\s*(?:perto de mim|aqui perto|nas proximidades|na minha localizacao)$/, "")
    .trim();
  if (location && municipio) return null;
  value = value.replace(/\s+mais\s+barat[oa]s?$/, "").replace(/^o mais barato de\s+/, "");
  const base = {
    ...current,
    ...(municipio ? { municipio, coords: null } : {}),
    ...(location ? { municipio: "", coords: null } : {}),
  };
  if (!value && (municipio || location)) return { draft: base, location };
  // A simple size correction must not replace the product or its variant.
  const sizeOnly = value.replace(/^(?:de|a de|o de)\s+/, "");
  const size = parseProduct(sizeOnly);
  if (
    (correction || stage === "size") &&
    !size.descricao &&
    !size.variante &&
    parseSize(sizeOnly)
  ) {
    if (base.mode !== "produto") return null;
    return { draft: { ...base, embalagem: size.embalagem }, location };
  }
  if (
    !request &&
    !correction &&
    !((stage === "product" || stage === "fuel") && (municipio || location))
  )
    return null;
  if (!/^(?:um|uma)\s+(?:litro|quilo|quilograma|grama|mililitro)/.test(value))
    value = value.replace(/^(?:uma?|o|a)\s+/, "").trim();
  if (!value || /\b(?:em|perto|onde|encontro|que|aquele|aquela|ser|com|por)\b/.test(value))
    return null;
  const fuel = parseFuelRequest(value, current.mode === "combustivel");
  if (fuel)
    return {
      draft: {
        ...base,
        mode: "combustivel",
        tipoCombustivel: fuel.tipo,
        descricao: "",
        embalagem: "",
        variante: "",
      },
      location,
    };
  const product = parseProduct(value);
  if (product.embalagem) product.descricao = product.descricao.replace(/^de\s+/, "");
  if (
    product.descricao.length < 3 ||
    product.descricao.length > 50 ||
    /\b(?:de|do|da)\s*$/.test(product.descricao)
  )
    return null;
  if (correction && normalize(product.descricao) === normalize(current.descricao)) {
    product.embalagem ||= current.embalagem;
    product.variante ||= current.variante;
  }
  return { draft: { ...base, mode: "produto", tipoCombustivel: null, ...product }, location };
}
