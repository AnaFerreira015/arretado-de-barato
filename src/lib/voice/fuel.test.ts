import { expect, it } from "vitest";
import { parseFuelRequest, rankFuelRecords, voicePrice } from "./fuel";
import { sale } from "./test-fixtures";
import { aiIntentSchema } from "./ai.schema";

it.each([["gasolina comum",1],["gasolina aditivada",2],["etanol",3],["diesel comum",4],["diesel S10",5],["gás natural veicular",6]] as const)("reconhece %s",(text, tipo)=> {
 expect(parseFuelRequest(text)?.tipo).toBe(tipo);
});
it("extrai pedido com município sem escolher tipo ambíguo",()=>{
 expect(parseFuelRequest("buscar gasolina comum mais barata em Maceió")).toEqual({tipo:1,municipio:"Maceió"});
 expect(parseFuelRequest("gasolina")?.tipo).toBeNull();
 expect(parseFuelRequest("diesel")?.tipo).toBeNull();
 expect(parseFuelRequest("álcool gel")).toBeNull();
 expect(parseFuelRequest("gasolina e etanol")?.tipo).toBeNull();
});
it("ordena só combustíveis com unidade compatível e mantém precisão",()=>{
 const a={...sale("GAS COMUM",5.899),kind:"combustivel" as const,unidade:"LT"};
 const b={...sale("GASOLINA",5.879),kind:"combustivel" as const,unidade:"L"};
 expect(rankFuelRecords([a,b,a,{...a,id:"bad",unidade:"UN",valorVenda:1}],1)).toEqual([b,a]);
 expect(voicePrice(a)).toContain("5,899");
 expect(voicePrice(a)).toContain("por litro");
 expect(rankFuelRecords([{...a,unidade:"M3"}],6)).toHaveLength(1);
 expect(voicePrice({...a,unidade:"M3"})).toContain("metro cúbico");
});
it("schema aceita tipo válido e rejeita contradições de combustível",()=>{
 const base={descricao:null,embalagem:null,variante:null,municipio:null,raio:null,dias:null,esclarecer:false,tipoBusca:"combustivel",tipoCombustivel:1};
 expect(aiIntentSchema.safeParse(base).success).toBe(true);
 expect(aiIntentSchema.safeParse({...base,tipoCombustivel:7}).success).toBe(false);
 expect(aiIntentSchema.safeParse({...base,tipoBusca:"produto"}).success).toBe(false);
 expect(aiIntentSchema.safeParse({...base,embalagem:"2 litros"}).success).toBe(false);
});
