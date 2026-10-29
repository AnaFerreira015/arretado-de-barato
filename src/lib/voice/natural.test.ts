import { expect, it } from "vitest";
import { naturalRequest } from "./natural";
import { newDraft } from "./flow";
const draft = {
  ...newDraft(),
  descricao: "coca",
  embalagem: "2 l",
  variante: "zero",
  municipio: "Maceió",
};
it("extrai pedido completo sem palavras de conversa na descrição", () => {
  expect(
    naturalRequest(
      "Eu queria uma Coca zero de dois litros mais barata em Maceió, por favor",
      newDraft(),
      "product",
    ),
  ).toMatchObject({
    draft: { descricao: "coca", embalagem: "2 l", variante: "zero", municipio: "Maceió" },
    location: false,
  });
});
it("corrige somente tamanho", () => {
  expect(naturalRequest("na verdade, quero de um litro", draft, "confirm")?.draft).toMatchObject({
    descricao: "coca",
    embalagem: "1 l",
    variante: "zero",
    municipio: "Maceió",
  });
});
it("troca produto sem herdar embalagem ou variante", () => {
  expect(naturalRequest("agora quero arroz em Maceió", draft, "results")?.draft).toMatchObject({
    descricao: "arroz",
    embalagem: "",
    variante: "",
    municipio: "Maceió",
  });
});
it("reconhece localização explícita em pedido completo", () => {
  expect(
    naturalRequest("quero gasolina comum mais barata perto de mim", newDraft(), "product"),
  ).toMatchObject({ draft: { mode: "combustivel", tipoCombustivel: 1 }, location: true });
});
it("aceita município dentro de resposta natural", () => {
  expect(naturalRequest("pode ser em Arapiraca", draft, "place")?.draft.municipio).toBe(
    "Arapiraca",
  );
});
it.each([
  "não quero coca",
  "quero arroz e feijão",
  "quero leite sem ser integral",
  "onde encontro aquele refrigerante da garrafa vermelha?",
])("não adivinha %s", (text) => {
  expect(naturalRequest(text, draft, "confirm")).toBeNull();
});
