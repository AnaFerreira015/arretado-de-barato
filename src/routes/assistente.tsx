import { createFileRoute, Link } from "@tanstack/react-router";
import { VoiceAssistant } from "@/components/voice/VoiceAssistant";

export const Route = createFileRoute("/assistente")({
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
  return (
    <div className="space-y-4">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center rounded-md font-semibold text-primary underline"
      >
        Voltar à busca de produtos
      </Link>
      <h1 className="text-2xl font-extrabold md:text-3xl">Assistente de voz</h1>
      <p className="text-muted-foreground">
        Encontre preços com orientação a cada passo, no seu ritmo.
      </p>
      <VoiceAssistant />
    </div>
  );
}
