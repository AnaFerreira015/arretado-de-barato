import { useEffect, useId, useState } from "react";
import { Download, Smartphone } from "lucide-react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [appleDevice, setAppleDevice] = useState<"iPhone" | "iPad" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const instructionsId = useId();

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
      setAppleDevice("iPad");
    } else if (/iPhone|iPod/i.test(ua)) {
      setAppleDevice("iPhone");
    }
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
    if (busy) return;
    if (!prompt) {
      setShowInstructions(true);
      return;
    }
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
      setShowInstructions(true);
    }
  };

  if (installed) return null;
  return (
    <section
      aria-label="Instalar Arretado de Barato"
      className="mx-auto w-full max-w-6xl px-4 pt-4 text-sm"
    >
      <div className="rounded-2xl border border-input/50 bg-primary-soft p-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card text-primary">
              <Smartphone aria-hidden className="size-6" />
            </span>
            <div>
              <p className="text-base font-bold text-primary">Leve o Arretado com você</p>
              <p className="text-muted-foreground">Instale grátis e acesse pela tela inicial.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={install}
            disabled={busy}
            aria-controls={!prompt ? instructionsId : undefined}
            aria-expanded={!prompt ? showInstructions : undefined}
            className="inline-flex min-h-12 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground shadow-soft hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            <Download aria-hidden className="size-5" />
            {busy
              ? "Abrindo instalação…"
              : prompt
                ? "Instalar app grátis"
                : appleDevice
                  ? `Como instalar no ${appleDevice}`
                  : "Como instalar o app"}
          </button>
        </div>
        <p role="status" className={message ? "mt-3" : undefined}>
          {message}
        </p>
        <details
          id={instructionsId}
          open={showInstructions}
          onToggle={(event) => setShowInstructions(event.currentTarget.open)}
          className="mt-2 max-w-xl text-muted-foreground"
        >
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-primary">
            Como instalar no celular ou computador
          </summary>
          <div className="space-y-2 pb-2">
            {appleDevice && (
              <div className="rounded-xl bg-card p-3 text-foreground">
                <p className="font-semibold">No Chrome do {appleDevice}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Toque em Compartilhar, ao lado da barra de endereço do Chrome.</li>
                  <li>Selecione “Adicionar à Tela de Início”.</li>
                  <li>Confirme em “Adicionar”.</li>
                </ol>
                <p className="mt-2">O iOS exige esses passos no navegador para instalar o app.</p>
              </div>
            )}
            <p>
              No Android ou computador, abra o menu do navegador e procure “Instalar aplicativo” ou
              “Adicionar à tela inicial”, se disponível.
            </p>
            <p>
              No iPhone ou iPad, use o Chrome ou Safari: toque no ícone Compartilhar do navegador,
              escolha “Adicionar à Tela de Início” e confirme em “Adicionar”. Se aparecer “Abrir
              como App”, deixe ativado.
            </p>
            <p>
              Se estiver dentro de outro aplicativo, abra o link no navegador. As consultas de
              preços precisam de internet. A disponibilidade do microfone depende do navegador e das
              permissões.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
