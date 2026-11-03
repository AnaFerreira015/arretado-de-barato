import { useEffect, useState } from "react";

export function PwaStatus() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (import.meta.env.PROD && window.isSecureContext && "serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // A instalação offline não deve impedir o uso normal do site.
        });
    }
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <div role="status" aria-live="polite">
      {offline && (
        <p className="mb-4 rounded-xl border border-input bg-secondary p-3 text-secondary-foreground">
          Você está sem conexão. Reconecte-se para consultar preços. Os resultados já exibidos não
          serão atualizados enquanto você estiver offline.
        </p>
      )}
    </div>
  );
}
