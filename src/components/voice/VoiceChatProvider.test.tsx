import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { VoiceChatProvider } from "./VoiceChatProvider";
import { useVoiceChat } from "./voiceChatContext";
const { loaded } = vi.hoisted(() => ({ loaded: vi.fn() }));
vi.mock("./VoiceChat", () => {
  loaded();
  return {
    ChatConversation: () => (
      <div role="log" aria-label="Conversa">
        Conversa carregada
      </div>
    ),
  };
});
afterEach(cleanup);
function Entry() {
  const open = useVoiceChat();
  return <button onClick={() => open()}>Abrir conversa</button>;
}
it("carrega a conversa somente ao abrir e devolve o foco ao fechar", async () => {
  render(
    <VoiceChatProvider>
      <Entry />
    </VoiceChatProvider>,
  );
  expect(loaded).not.toHaveBeenCalled();
  const trigger = screen.getByRole("button", { name: "Abrir conversa" });
  trigger.focus();
  fireEvent.click(trigger);
  expect(await screen.findByRole("log")).toHaveTextContent("Conversa carregada");
  expect(loaded).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Fechar chat" }));
  await waitFor(() => expect(trigger).toHaveFocus());
});
