import { describe, expect, it } from "vitest";
import { parseCommand, parseProduct, parseSize, resolveMunicipio } from "./intent";

describe("pedidos guiados", () => {
  it.each([
    ["Próximo!", "next"],
    ["parar leitura", "stop"],
    ["Confirmar busca", "confirm"],
    ["carregar mais resultados", "more"],
    ["corrigir produto", "editProduct"],
    ["usar minha localização", "location"],
    ["repetir", "repeat"],
  ])("reconhece %s", (text, expected) => expect(parseCommand(text)).toBe(expected));
  it("não interpreta nome de produto como comando parcial", () => {
    expect(parseCommand("arroz próximo")).toBeNull();
    expect(parseProduct("buscar Coca-Cola zero de dois litros")).toEqual({
      descricao: "Coca-Cola",
      embalagem: "2 l",
      variante: "zero",
    });
  });
  it.each(["2L", "2 litros", "2000 ml", "dois litros"])("normaliza %s", (text) => {
    expect(parseSize(text)).toEqual({ amount: 2000, unit: "ml" });
  });
  it("rejeita tamanhos ambíguos e pacotes múltiplos", () => {
    expect(parseSize("6 x 350ml")).toBeNull();
    expect(parseSize("2L ou 3L")).toBeNull();
    expect(parseSize("grande")).toBeNull();
  });
  it("resolve apenas município exato sem acentos", () => {
    expect(resolveMunicipio("Maceio")).toBe(2704302);
    expect(resolveMunicipio("São")).toBeNull();
    expect(resolveMunicipio("Recife")).toBeNull();
  });
});
