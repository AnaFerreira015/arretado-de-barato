import { useState } from "react";
import { TypeFilter, type ItemType } from "@/components/search/TypeFilter";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fuel, Package, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LIMITS, fuelName, municipioNome } from "@/lib/economiza/constants";
import { formatBRL, formatDateTime } from "@/lib/economiza/format";
import { fuelFormStore, productFormStore } from "@/lib/economiza/searchStores";
import { favoritesStore, type Favorite, type SavedPlace } from "@/lib/store";
import type { PlaceState } from "@/components/eal/PlaceSelector";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Arretado de Barato" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content:
          "Suas pesquisas e produtos favoritos, salvos neste aparelho para consultar de novo.",
      },
      { property: "og:title", content: "Favoritos — Arretado de Barato" },
      { property: "og:description", content: "Repita pesquisas de preços salvas com um toque." },
    ],
  }),
  component: FavoritesPage,
});

function placeText(p: SavedPlace) {
  if (p.tipo === "municipio") return municipioNome(p.codigoIBGE);
  if (p.tipo === "individual") return `CNPJ ${p.cnpj}`;
  return `Perto de você (até ${p.raio} km)`;
}

function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((res, rej) => {
    if (!("geolocation" in navigator)) return rej(new Error("no geo"));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      rej,
      { timeout: 12000, maximumAge: 120000 },
    );
  });
}

export function FavoritesPage() {
  const favs = favoritesStore.use();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ItemType>("todos");
  const visible = favs.filter((f) => filter === "todos" || f.kind === filter);

  const rerun = async (f: Favorite) => {
    let place: PlaceState = {
      mode: "municipio",
      municipio: null,
      raio: LIMITS.raioDefault,
      coords: null,
    };
    let cnpj = "";
    if (f.place.tipo === "municipio") place.municipio = f.place.codigoIBGE;
    else if (f.place.tipo === "individual") cnpj = f.place.cnpj;
    else {
      try {
        const c = await getPosition();
        place = { ...place, mode: "geo", coords: c, raio: f.place.raio };
      } catch {
        toast.error("Não foi possível obter sua localização. Escolha um município e pesquise.");
      }
    }
    const canRun = place.mode === "geo" ? !!place.coords : !!(place.municipio || cnpj);
    if (f.kind === "produto") {
      productFormStore.set((s) => ({
        ...s,
        modo: f.modo,
        termo: f.termo,
        gpc: f.gpc ?? "",
        ncm: f.ncm ?? "",
        cnpj,
        dias: f.dias,
        place,
        pendingRun: canRun,
      }));
      void navigate({ to: "/", search: { tipo: "produto" } });
    } else {
      fuelFormStore.set((s) => ({
        ...s,
        tipo: f.tipoCombustivel,
        cnpj,
        dias: f.dias,
        place,
        pendingRun: canRun,
      }));
      void navigate({ to: "/", search: { tipo: "combustivel" } });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold md:text-3xl">Favoritos</h1>
      <p className="text-muted-foreground">
        Guardados só neste aparelho, sem sincronização. Ao abrir um favorito, uma nova pesquisa é
        feita.
      </p>
      <div className="card-surface p-4">
        <TypeFilter value={filter} onChange={setFilter} includeAll label="Filtrar favoritos" />
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {visible.length} {visible.length === 1 ? "favorito" : "favoritos"}
      </p>
      {favs.length === 0 ? (
        <div className="card-surface p-5">
          <p>
            Você ainda não salvou nada. Nos resultados, use “Favoritar” ou “Salvar esta pesquisa”.
          </p>
          <Button asChild className="mt-3">
            <Link to="/">Ir para a pesquisa</Link>
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="card-surface p-5">
          <p>Nenhum favorito deste tipo.</p>
          <Button variant="outline" className="mt-3" onClick={() => setFilter("todos")}>
            Ver todos os favoritos
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((f) => (
            <li key={f.id} className="card-surface flex flex-wrap items-center gap-3 p-4">
              {f.kind === "produto" ? (
                <Package aria-hidden className="size-6 text-primary" />
              ) : (
                <Fuel aria-hidden className="size-6 text-primary" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold break-words">{f.label}</h2>
                <p className="text-sm text-muted-foreground">
                  {f.kind === "produto"
                    ? f.modo === "gtin"
                      ? `Código de barras ${f.termo}`
                      : `Busca por “${f.termo}”`
                    : fuelName(f.tipoCombustivel)}
                  {" · "}
                  {placeText(f.place)} · {f.dias} dias
                </p>
                {f.kind === "produto" && f.lastSeen && (
                  <p className="text-sm text-muted-foreground">
                    Visto antes: {formatBRL(f.lastSeen.valor)} em {f.lastSeen.loja}, venda de{" "}
                    {formatDateTime(f.lastSeen.at)}. Este valor não é atualizado.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => rerun(f)}>
                  <Search aria-hidden /> Pesquisar de novo
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Remover ${f.label} dos favoritos`}
                  onClick={() => favoritesStore.set((l) => l.filter((x) => x.id !== f.id))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
