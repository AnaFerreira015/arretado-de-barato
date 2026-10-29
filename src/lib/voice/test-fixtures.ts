import { adaptRecord } from "@/lib/economiza/adapter";

export function sale(descricao: string, price = 7, code = descricao) {
  return adaptRecord({
    produto: { codigo: code, descricao, gtin: "7890000000000", unidadeMedida: "UN", venda: { dataVenda: "2026-10-28T14:00:00Z", valorVenda: price } },
    estabelecimento: { cnpj: "12345678000100", nomeFantasia: "Mercado Teste", endereco: { municipio: "Maceió", nomeLogradouro: "Rua A", numeroImovel: "10" } },
  }, "produto")!;
}
