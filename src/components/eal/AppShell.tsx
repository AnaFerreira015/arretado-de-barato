import { Link } from "@tanstack/react-router";
import { Fuel, GitCompareArrows, Heart, Info, ListChecks, Search } from "lucide-react";
import type { ReactNode } from "react";
import { compareStore } from "@/lib/store";

const NAV = [
  { to: "/", label: "Buscar", icon: Search },
  { to: "/combustiveis", label: "Combustíveis", icon: Fuel },
  { to: "/lista", label: "Lista", icon: ListChecks },
  { to: "/favoritos", label: "Favoritos", icon: Heart },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const compareCount = compareStore.use().length;
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2 rounded-md font-display text-base sm:text-xl font-extrabold text-primary">
            <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              R$
            </span>
            <span className="max-w-32 leading-tight sm:max-w-none">Arretado de Barato</span>
          </Link>
          <nav aria-label="Principal" className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    activeOptions={{ exact: n.to === "/" }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-primary-soft data-[status=active]:text-accent-foreground"
                  >
                    <n.icon aria-hidden className="size-5" /> {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/sobre" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-muted-foreground hover:bg-accent data-[status=active]:bg-primary-soft data-[status=active]:text-accent-foreground">
                  <Info aria-hidden className="size-5" /> Sobre
                </Link>
              </li>
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1 lg:ml-2">
            <Link
              to="/comparar"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border-2 px-3 text-sm font-semibold hover:bg-accent data-[status=active]:border-primary"
            >
              <GitCompareArrows aria-hidden className="size-5" />
              <span className="sr-only sm:not-sr-only">Comparar</span>
              <span className="rounded-full bg-primary px-2 text-primary-foreground" aria-label={`${compareCount} itens`}>
                {compareCount}
              </span>
            </Link>
            <Link to="/sobre" className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-accent lg:hidden" aria-label="Sobre os dados">
              <Info aria-hidden className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 outline-none lg:pb-12">
        {children}
      </main>

      <footer className="border-t bg-card pb-24 lg:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-5 text-sm text-muted-foreground">
          Arretado de Barato é um aplicativo independente que utiliza dados públicos do Economiza Alagoas, da SEFAZ/AL. Não é um
          aplicativo oficial do governo.
        </div>
      </footer>

      <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card lg:hidden">
        <ul className="grid grid-cols-4">
          {NAV.map((n) => (
            <li key={n.to}>
              <Link
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold text-muted-foreground data-[status=active]:text-primary"
              >
                {({ isActive }) => (
                  <>
                    <n.icon aria-hidden className="size-6" strokeWidth={isActive ? 2.6 : 2} />
                    <span className={isActive ? "underline underline-offset-4" : undefined}>{n.label}</span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
