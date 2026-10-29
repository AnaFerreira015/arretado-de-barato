import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VoiceAssistant } from "./VoiceAssistant";
import { sale } from "@/lib/voice/test-fixtures";

const { search, interpret } = vi.hoisted(() => ({ search: vi.fn(), interpret: vi.fn() }));
vi.mock("@/lib/economiza/api.functions", () => ({ searchProducts: search }));
vi.mock("@/lib/voice/ai.functions", () => ({ interpretVoice: interpret }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const send = (text: string) => {
  fireEvent.change(screen.getByLabelText("Sua resposta ou comando"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));
};
it("oferece fluxo de texto completo, labels e confirmação sem ativar voz", async () => {
  search.mockResolvedValue({ ok: true, demo: true, cached: false, fetchedAt: "2026-10-29T12:00:00Z", page: {
    items: [sale("COCA ZERO 2L", 8), sale("COCA ZERO 2L", 6, "b")], invalidCount: 0,
    pagina: 1, totalPaginas: 1, totalRegistros: 2, registrosPagina: 2, registrosPorPagina: 100, primeiraPagina: true, ultimaPagina: true,
  } });
  render(<VoiceAssistant />);
  expect(screen.getByRole("checkbox", { name: "Ativar respostas faladas" })).not.toBeChecked();
  expect(screen.getByText(/não oferece reconhecimento de voz/i)).toBeVisible();
  send("buscar coca zero 2 litros"); send("manter"); send("manter"); send("Maceió");
  expect(search).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar busca" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Resultados da busca" })).toBeVisible());
  expect(screen.getAllByText(/Dados demonstrativos/).length).toBeGreaterThan(0);
  const rows = screen.getAllByTestId("voice-result");
  expect(rows[0]).toHaveTextContent("6,00");
  expect(rows[1]).toHaveTextContent("8,00");
  expect(interpret).not.toHaveBeenCalled();
});
it("microfone e IA têm avisos e erro não apaga o pedido", async () => {
  interpret.mockResolvedValue({ ok: false, code: "quota", message: "Continue pelo modo guiado." });
  render(<VoiceAssistant />);
  expect(screen.getByText(/áudio ao serviço de reconhecimento/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Interpretar um pedido completo com IA (opcional)"));
  fireEvent.change(screen.getByLabelText("Pedido completo para a IA"), { target: { value: "quero arroz em Maceió" } });
  fireEvent.click(screen.getByRole("button", { name: "Interpretar pedido com IA" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Continue pelo modo guiado."));
  expect(screen.getByLabelText("Pedido completo para a IA")).toHaveValue("quero arroz em Maceió");
  expect(search).not.toHaveBeenCalled();
});
