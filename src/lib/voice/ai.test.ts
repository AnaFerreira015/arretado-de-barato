import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { interpretVoiceText } from "./ai.server";

const proposal = { descricao: "coca", embalagem: "2 litros", variante: "zero", municipio: "Maceió", raio: null, dias: null, esclarecer: false };
const response = (value: unknown) => new Response(JSON.stringify({ success: true, result: { response: JSON.stringify(value) } }));

beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "a".repeat(32));
  vi.stubEnv("CLOUDFLARE_AI_API_TOKEN", "test-secret");
  vi.stubEnv("VOICE_AI_MODEL", "@cf/meta/llama-3.1-8b-instruct-fp8");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("interpretação opcional", () => {
  it("sem segredo devolve modo indisponível sem chamar fornecedor", async () => {
    vi.stubEnv("CLOUDFLARE_AI_API_TOKEN", "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await interpretVoiceText("arroz")).toMatchObject({ ok: false, code: "unconfigured" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["", "a".repeat(501), null, { text: "arroz" }])("valida entrada antes do envio", async (text) => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await interpretVoiceText(text)).toMatchObject({ ok: false, code: "invalid" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("envia somente a frase e devolve proposta validada", async () => {
    const fetch = vi.fn().mockResolvedValue(response(proposal)); vi.stubGlobal("fetch", fetch);
    expect(await interpretVoiceText("coca zero 2 litros em Maceió")).toMatchObject({ ok: true, intent: proposal });
    const [url, options] = fetch.mock.calls[0]!;
    expect(url).toBe(`https://api.cloudflare.com/client/v4/accounts/${"a".repeat(32)}/ai/run/@cf/meta/llama-3.1-8b-instruct-fp8`);
    expect(options.redirect).toBe("manual");
    const payload = JSON.parse(options.body);
    expect(payload.messages[1]).toEqual({ role: "user", content: "coca zero 2 litros em Maceió" });
    expect(payload.messages).toHaveLength(2);
  });
  it.each([
    { ...proposal, latitude: -9 }, { ...proposal, municipio: "Recife" },
    { ...proposal, raio: 16 }, { ...proposal, dias: 0 }, { ...proposal, descricao: "a" },
  ])("rejeita campos inesperados ou fora dos limites", async (value) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(value)));
    expect(await interpretVoiceText("arroz")).toMatchObject({ ok: false, code: "invalid-response" });
  });
  it.each([429, 500, 302])("falha HTTP %s sem expor resposta nem repetir", async (status) => {
    const fetch = vi.fn().mockResolvedValue(new Response("sensitive", { status })); vi.stubGlobal("fetch", fetch);
    const result = await interpretVoiceText("arroz");
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain("sensitive");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("recupera JSON inválido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json")));
    expect(await interpretVoiceText("arroz")).toMatchObject({ ok: false });
  });
  it("aborta em dez segundos e permite continuar guiado", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("", "AbortError")));
    })));
    const result = interpretVoiceText("arroz");
    await vi.advanceTimersByTimeAsync(10000);
    expect(await result).toMatchObject({ ok: false, code: "unavailable" });
  });
});
