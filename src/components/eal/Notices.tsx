import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FlaskConical, Info, RefreshCw, ServerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DATA_NOTICE, MESSAGES } from "@/lib/economiza/constants";
import { getApiStatus } from "@/lib/economiza/api.functions";
import { prefsStore } from "@/lib/store";

export function DataNotice() {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-info-soft px-3 py-2 text-sm text-info-foreground">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{DATA_NOTICE}</span>
    </p>
  );
}

export function useApiStatus() {
  return useQuery({ queryKey: ["api-status"], queryFn: () => getApiStatus(), staleTime: 60_000 });
}

/** Shows demo-mode badge or the real-integration configuration state. */
export function ModeBanner() {
  const prefs = prefsStore.use();
  const status = useApiStatus();
  if (prefs.demo)
    return (
      <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-warning bg-warning-soft px-3 py-2 text-sm text-warning-foreground">
        <FlaskConical aria-hidden className="size-5 shrink-0" />
        <span className="font-semibold">Modo demonstração: dados fictícios.</span>
        <span>Nenhum preço desta tela é real.</span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => prefsStore.set((p) => ({ ...p, demo: false }))}>
          Sair do modo demonstração
        </Button>
      </div>
    );
  const s = status.data?.status;
  if (!s || s === "ready") return null;
  return (
    <div className="rounded-lg border-2 border-warning bg-warning-soft px-3 py-3 text-sm text-warning-foreground">
      <p className="flex items-start gap-2 font-semibold">
        <ServerOff aria-hidden className="mt-0.5 size-5 shrink-0" />
        {MESSAGES[s]}
      </p>
      <p className="mt-1 pl-7">
        Para avaliar a aparência do aplicativo, você pode ativar o modo demonstração, com dados fictícios claramente identificados.
      </p>
      <div className="mt-2 pl-7">
        <Button size="sm" variant="outline" onClick={() => prefsStore.set((p) => ({ ...p, demo: true }))}>
          <FlaskConical aria-hidden /> Ativar modo demonstração
        </Button>
      </div>
    </div>
  );
}

export function ErrorState({ message, detail, onRetry }: { message: string; detail?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card-surface flex flex-col gap-3 border-destructive/40 p-4">
      <p className="flex items-start gap-2 font-semibold text-destructive">
        <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
        {message}
      </p>
      {detail && <p className="text-sm text-muted-foreground">Mensagem do serviço: “{detail}”</p>}
      {onRetry && (
        <Button variant="outline" className="self-start" onClick={onRetry}>
          <RefreshCw aria-hidden /> Tentar novamente
        </Button>
      )}
    </div>
  );
}
