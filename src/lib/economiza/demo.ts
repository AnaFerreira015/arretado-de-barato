// Fictional data for the explicitly-activated demo mode. Never used as a fallback for real failures.
import type { FuelBody, ProductBody } from "./validation";
import { municipioNome } from "./constants";

const STORES = [
  { cnpj: "00000000000101", fantasia: "Mercado Exemplo Centro", razao: "MERCADO EXEMPLO LTDA", bairro: "Centro", lat: -9.6658, lng: -35.7353 },
  { cnpj: "00000000000202", fantasia: "", razao: "SUPERMERCADO FICTICIO S.A.", bairro: "Farol", lat: -9.6483, lng: -35.7276 },
  { cnpj: "00000000000303", fantasia: "Atacarejo Demonstração", razao: "ATACAREJO DEMO LTDA", bairro: "Tabuleiro", lat: -9.5921, lng: -35.7462 },
  { cnpj: "00000000000404", fantasia: "Mercadinho Modelo", razao: "MERCADINHO MODELO ME", bairro: "Ponta Verde", lat: -9.6650, lng: -35.7090 },
  { cnpj: "00000000000505", fantasia: "Empório Teste", razao: "EMPORIO TESTE EIRELI", bairro: "Jatiúca", lat: 0, lng: 0 },
];

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Math.abs(h);
}

function storeJson(i: number, municipio: string, codigo: number) {
  const s = STORES[i % STORES.length];
  return {
    cnpj: s.cnpj,
    razaoSocial: s.razao,
    nomeFantasia: s.fantasia,
    telefone: i % 2 ? "(82) 0000-0000" : "",
    endereco: {
      nomeLogradouro: "RUA FICTÍCIA",
      numeroImovel: String(100 + i * 37),
      bairro: s.bairro.toUpperCase(),
      cep: "57000000",
      codigoIBGE: String(codigo),
      municipio: municipio.toUpperCase(),
      latitude: s.lat,
      longitude: s.lng,
    },
  };
}

function wrap(body: { pagina: number; registrosPorPagina: number }, conteudo: unknown[]) {
  return {
    totalRegistros: conteudo.length,
    totalPaginas: 1,
    pagina: body.pagina,
    registrosPorPagina: body.registrosPorPagina,
    registrosPagina: body.pagina === 1 ? conteudo.length : 0,
    primeiraPagina: body.pagina === 1,
    ultimaPagina: true,
    conteudo: body.pagina === 1 ? conteudo : [],
  };
}

function placeInfo(est: ProductBody["estabelecimento"]) {
  const code = "municipio" in est && est.municipio ? est.municipio.codigoIBGE : 2704302;
  return { code, nome: municipioNome(code) };
}

export function demoProducts(body: ProductBody, now = Date.now()) {
  const termo = (body.produto.descricao ?? body.produto.gtin ?? "produto").toUpperCase();
  const { code, nome } = placeInfo(body.estabelecimento);
  const base = 3 + (hash(termo) % 1500) / 100;
  const gtin = body.produto.gtin ?? `789${String(hash(termo)).padStart(10, "0").slice(0, 10)}`;
  const items = Array.from({ length: 8 }, (_, i) => {
    const sameGtin = i < 5;
    const price = Math.round((base * (0.85 + ((hash(termo + i) % 40) / 100))) * 100) / 100;
    return {
      produto: {
        codigo: String(1000 + i),
        descricao: sameGtin ? `${termo} EXEMPLO 1KG` : `${termo} MARCA FICTICIA ${i % 2 ? "500G" : "PCT"}`,
        descricaoSefaz: sameGtin ? `${termo} EXEMPLO 1 KG` : "",
        gtin: sameGtin ? gtin : i === 7 ? "" : `0${String(hash(termo + "x" + i)).slice(0, 12).padStart(12, "1")}`,
        ncm: "10063021",
        gpc: "50000000",
        unidadeMedida: "UN",
        venda: {
          dataVenda: new Date(now - (i * 7 + 2) * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z"),
          valorDeclarado: Math.round(price * 1.04 * 100) / 100,
          valorVenda: price,
        },
      },
      estabelecimento: storeJson(i, nome, code),
    };
  });
  return wrap(body, items);
}

export function demoFuel(body: FuelBody, now = Date.now()) {
  const { code, nome } = placeInfo(body.estabelecimento);
  const t = body.produto.tipoCombustivel;
  const base = [0, 6.19, 6.39, 4.59, 6.09, 6.29, 4.89][t];
  const unidade = t === 6 ? "M3" : "LT";
  const items = Array.from({ length: 5 }, (_, i) => ({
    produto: {
      codigo: String(t * 10 + i),
      descricao: ["", "GASOLINA C COMUM", "GASOLINA C ADITIVADA", "ETANOL HIDRATADO", "OLEO DIESEL B S500", "OLEO DIESEL B S10 ADITIVADO", "GAS NATURAL VEICULAR"][t],
      unidadeMedida: unidade,
      venda: {
        dataVenda: new Date(now - (i * 5 + 1) * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z"),
        valorDeclarado: base + i * 0.07,
        valorVenda: Math.round((base + i * 0.071 - (i === 2 ? 0.2 : 0)) * 1000) / 1000,
      },
    },
    estabelecimento: { ...storeJson(i, nome, code), nomeFantasia: `Posto Exemplo ${i + 1}` },
  }));
  return wrap(body, items);
}
