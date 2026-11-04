import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { VoiceChatProvider } from "./VoiceChat";
import { useVoiceChat } from "./voiceChatContext";
import { sale } from "@/lib/voice/test-fixtures";
const { search, interpret } = vi.hoisted(() => ({ search: vi.fn(), interpret: vi.fn() }));
vi.mock("@/lib/economiza/api.functions", () => ({ searchProducts: search, searchFuel: search }));
vi.mock("@/lib/voice/ai.functions", () => ({ interpretVoice: interpret }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function Entry() {
  const open = useVoiceChat();
  return (
    <>
      <button onClick={() => open()}>Abrir chat</button>
      <p>Pesquisa atual preservada</p>
    </>
  );
}
it("abre conversa sobre a tela e permite fechar sem navegar", async () => {
  render(
    <VoiceChatProvider>
      <Entry />
    </VoiceChatProvider>,
  );
  fireEvent.click(screen.getByText("Abrir chat"));
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(screen.getByRole("log")).toHaveTextContent(/O que você quer encontrar/);
  expect(screen.getByText("Pesquisa atual preservada")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Fechar chat" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it("envia texto livre e mostra a conversa e preços sem confirmação adicional", async () => {
  search.mockResolvedValue({
    ok: true,
    demo: false,
    page: {
      items: [sale("LEITE 1L", 4)],
      invalidCount: 0,
      pagina: 1,
      totalPaginas: 1,
      totalRegistros: 1,
      registrosPagina: 1,
      registrosPorPagina: 100,
      primeiraPagina: true,
      ultimaPagina: true,
    },
  });
  render(
    <VoiceChatProvider>
      <Entry />
    </VoiceChatProvider>,
  );
  fireEvent.click(screen.getByText("Abrir chat"));
  fireEvent.change(screen.getByRole("textbox", { name: "Mensagem para o Arretado" }), {
    target: { value: "buscar leite de 1 litro em Maceió" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
  await waitFor(() => expect(search).toHaveBeenCalledOnce());
  expect(screen.getByRole("log")).toHaveTextContent("buscar leite de 1 litro em Maceió");
  await waitFor(() =>
    expect(screen.getByRole("region", { name: "Preços encontrados" })).toHaveTextContent("4,00"),
  );
  expect(interpret).not.toHaveBeenCalled();
});
