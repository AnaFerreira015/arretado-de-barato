import { useVoiceChat } from "@/components/voice/voiceChatContext";
import { Mic } from "lucide-react";
import { ProductSearchPanel } from "./ProductSearchPanel";
import { FuelSearchPanel } from "./FuelSearchPanel";
import { TypeFilter } from "./TypeFilter";
import { ModeBanner } from "@/components/eal/Notices";
import type { SearchMode } from "@/lib/economiza/searchMode";

export function SearchHub({
  mode,
  onModeChange,
}: {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}) {
  const openChat = useVoiceChat();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Encontre o menor preço</h1>
        <p className="mt-1 text-muted-foreground">Pesquise produtos e combustíveis em Alagoas.</p>
      </header>
      <ModeBanner />
      <section
        aria-label="Escolher tipo de pesquisa"
        className="grid gap-5 rounded-2xl border bg-card p-4 shadow-soft sm:p-5 lg:grid-cols-[1fr_auto] lg:items-end"
      >
        <TypeFilter
          value={mode}
          onChange={(value) => {
            if (value !== "todos") onModeChange(value);
          }}
        />
        <button
          type="button"
          onClick={() => openChat(mode)}
          aria-haspopup="dialog"
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-input px-4 font-semibold text-primary hover:bg-accent"
        >
          <Mic aria-hidden className="size-5" />
          Buscar por voz
        </button>
      </section>
      {mode === "produto" ? <ProductSearchPanel /> : <FuelSearchPanel />}
    </div>
  );
}
