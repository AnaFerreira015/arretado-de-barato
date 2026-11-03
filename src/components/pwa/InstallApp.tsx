import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const mode = window.matchMedia("(display-mode: standalone)");
    const syncMode = () =>
      setInstalled(
        mode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
      );
    const available = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    syncMode();
    mode.addEventListener("change", syncMode);
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", done);
    return () => {
      mode.removeEventListener("change", syncMode);
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  const install = async () => {
    if (!prompt || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Instalação solicitada. Siga a confirmação do navegador."
          : "Você pode instalar depois pelo menu do navegador.",
      );
    } catch {
      setMessage("Não foi possível abrir a instalação. Use as instruções abaixo.");
    } finally {
      setPrompt(null);
      setBusy(false);
    }
  };

  if (installed) return null;
  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 text-sm">
      {prompt && (
        <button
          type="button"
          onClick={install}
          disabled={busy}
          className="mb-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-input bg-card px-4 font-semibold text-primary hover:bg-accent disabled:cursor-wait disabled:opacity-60"
        >
          <Download aria-hidden className="size-5" />
          {busy ? "Abrindo instalação…" : "Instalar aplicativo"}
        </button>
      )}
      <p role="status">{message}</p>
      <details className="max-w-xl text-muted-foreground">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-primary">
          Como instalar no celular ou computador
        </summary>
        <div className="space-y-2 pb-2">
          <p>
            No Android ou computador, abra o menu do navegador e procure “Instalar aplicativo” ou
            “Adicionar à tela inicial”, se disponível.
          </p>
          <p>
            No iPhone ou iPad, abra o site no Safari, toque em Compartilhar e em “Adicionar à Tela
            de Início”. Se aparecer “Abrir como App”, deixe ativado.
          </p>
          <p>
            Se estiver dentro de outro aplicativo, abra o link no navegador. As consultas de preços
            precisam de internet. A disponibilidade do microfone depende do navegador e das
            permissões.
          </p>
        </div>
      </details>
    </div>
  );
}
