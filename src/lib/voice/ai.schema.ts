import { z } from "zod";
import { LIMITS } from "@/lib/economiza/constants";
import { resolveMunicipio } from "./intent";

export const voiceTextSchema = z.string().trim().min(1).max(500);
export const aiIntentSchema = z
  .object({
    tipoBusca: z.enum(["produto", "combustivel"]).default("produto"),
    tipoCombustivel: z.number().int().min(1).max(6).nullable().default(null),
    descricao: z.string().trim().min(LIMITS.descricaoMin).max(LIMITS.descricaoMax).nullable(),
    embalagem: z.string().trim().max(50).nullable(),
    variante: z.string().trim().max(50).nullable(),
    municipio: z
      .string()
      .trim()
      .max(80)
      .refine((name) => resolveMunicipio(name) !== null)
      .nullable(),
    raio: z.number().int().min(LIMITS.raioMin).max(LIMITS.raioMax).nullable(),
    dias: z.number().int().min(LIMITS.diasMin).max(LIMITS.diasMax).nullable(),
    esclarecer: z.boolean(),
    usarLocalizacao: z.boolean().default(false),
  })
  .strict()
  .refine(
    (i) =>
      i.tipoBusca === "produto"
        ? i.tipoCombustivel === null
        : i.embalagem === null && i.variante === null,
    "Campos incompatíveis com o tipo de busca",
  );
export type AiIntent = z.infer<typeof aiIntentSchema>;
export type InterpretResponse =
  | { ok: true; intent: AiIntent }
  | {
      ok: false;
      code: "invalid" | "unconfigured" | "unavailable" | "quota" | "invalid-response";
      message: string;
    };

export const voiceContextSchema = z
  .object({
    tipoBusca: z.enum(["produto", "combustivel"]),
    tipoCombustivel: z.number().int().min(1).max(6).nullable(),
    descricao: z.string().max(50),
    embalagem: z.string().max(50),
    variante: z.string().max(50),
    municipio: z.string().max(80),
    raio: z.number().int().min(1).max(15),
    dias: z.number().int().min(1).max(10),
    etapa: z.enum([
      "product",
      "fuel",
      "size",
      "variant",
      "place",
      "radius",
      "days",
      "confirm",
      "results",
    ]),
  })
  .strict();
export type VoiceContext = z.infer<typeof voiceContextSchema>;
