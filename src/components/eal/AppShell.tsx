import { Link, useRouterState } from "@tanstack/react-router";
import { GitCompareArrows, Heart, Info, ListChecks, Search, Mic } from "lucide-react";
import type { ReactNode } from "react";
import { compareStore } from "@/lib/store";
import { searchMode } from "@/lib/economiza/searchMode";

import { InstallApp } from "@/components/pwa/InstallApp";
import { PwaStatus } from "@/components/pwa/PwaStatus";

const NAV = [
  { to: "/", label: "Buscar", icon: Search },
  { to: "/assistente", label: "Por voz", icon: Mic },
  { to: "/lista", label: "Minha lista", icon: ListChecks },
  { to: "/favoritos", label: "Favoritos", icon: Heart },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const compareCount = compareStore.use().length;
  const location = useRouterState({ select: (state) => state.location });
  const query = location.search as Record<string, unknown>;
  const mode = searchMode(query["tipo"] ?? query["modo"]);
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center gap-2 px-4 sm:gap-4">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 rounded-lg font-display font-extrabold text-primary"
          >
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-xl text-primary-foreground"
            >
              <img src="/logo.svg" alt="" width={40} height={40} className="size-10" />
            </span>
            <span className="max-w-36 text-base leading-tight sm:max-w-44 sm:text-xl">
              Arretado de Barato
              <span className="hidden text-xs font-medium tracking-wide text-muted-foreground sm:block">
                Seu dinheiro rende mais.
              </span>
            </span>
          </Link>
          <nav aria-label="Principal" className="ml-auto hidden lg:block">
            <ul className="flex gap-1">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    search={n.to === "/assistente" ? { modo: mode } : {}}
                    activeOptions={{ exact: n.to === "/", includeSearch: false }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-muted-foreground hover:bg-accent data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
                  >
                    <n.icon aria-hidden className="size-5" />
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-2">
            <Link
              to="/comparar"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold hover:bg-accent data-[status=active]:border-primary"
            >
              <GitCompareArrows aria-hidden className="size-5" />
              <span className="sr-only sm:not-sr-only">Comparar</span>
              <span
                className="rounded-full bg-primary px-2 text-primary-foreground"
                aria-label={`${compareCount} itens`}
              >
                {compareCount}
              </span>
            </Link>
            <Link
              to="/sobre"
              className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-accent"
              aria-label="Sobre os dados"
            >
              <Info aria-hidden className="size-5" />
            </Link>
          </div>
        </div>
      </header>
      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 outline-none sm:pt-8 lg:pb-12"
      >
        <PwaStatus />
        {children}
      </main>
      <footer className="border-t bg-card pb-24 lg:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display font-bold text-primary">Arretado de Barato</p>
          <p className="max-w-xl">
            Aplicativo independente com dados públicos do Economiza Alagoas, da SEFAZ/AL. Não é um
            aplicativo oficial do governo.
          </p>
        </div>
        <InstallApp />
      </footer>
      <nav
        aria-label="Navegação inferior"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-4">
          {NAV.map((n) => (
            <li key={n.to}>
              <Link
                to={n.to}
                search={n.to === "/assistente" ? { modo: mode } : {}}
                activeOptions={{ exact: n.to === "/", includeSearch: false }}
                className="flex min-h-20 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground data-[status=active]:text-primary"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={
                        isActive
                          ? "grid h-9 w-14 place-items-center rounded-xl bg-primary text-primary-foreground"
                          : "grid h-9 w-14 place-items-center rounded-xl"
                      }
                    >
                      <n.icon aria-hidden className="size-6" strokeWidth={isActive ? 2.6 : 2} />
                    </span>
                    <span className={isActive ? "underline underline-offset-4" : undefined}>
                      {n.label}
                    </span>
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
