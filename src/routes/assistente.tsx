import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useVoiceChat } from "@/components/voice/voiceChatContext";

export const Route = createFileRoute("/assistente")({
  validateSearch: (search: Record<string, unknown>): { modo?: "combustivel" | "produto" } => ({
    modo: search["modo"] === "combustivel" ? "combustivel" : "produto",
  }),
  head: () => ({
    meta: [
      { title: "Assistente de voz — Arretado de Barato" },
      {
        name: "description",
        content: "Pesquise preços por voz ou texto com orientação passo a passo.",
      },
    ],
  }),
  component: AssistantPage,
});
function AssistantPage() {
  const { modo } = Route.useSearch();
  const openChat = useVoiceChat();
  const navigate = useNavigate();
  useEffect(() => {
    openChat(modo ?? "produto");
    void navigate({ to: "/", search: { tipo: modo ?? "produto" }, replace: true });
    // Compatibilidade com links antigos: abre o chat uma vez e volta à busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
