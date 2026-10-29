import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { BookmarkPlus, Calculator, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlaceSelector, initialPlace } from "@/components/eal/PlaceSelector";
import { PeriodSelect } from "@/components/eal/PeriodSelect";
import { FieldError } from "@/components/eal/FieldError";
import { ModeBanner } from "@/components/eal/Notices";
import { ResultsSection } from "@/components/eal/ResultsSection";
import { FUEL_TYPES, LIMITS, fuelName } from "@/lib/economiza/constants";
import { searchFuel } from "@/lib/economiza/api.functions";
import { fuelFormStore, fuelSearchStore, savedPlaceOf } from "@/lib/economiza/searchStores";
import { toPlace, useSearchRunner } from "@/lib/economiza/useSearch";
import { validateFuelQuery, validateCnpj, type FieldErrors, type FuelQuery } from "@/lib/economiza/validation";
import { formatBRL } from "@/lib/economiza/format";
import { favoritesStore, uid } from "@/lib/store";

export const Route = createFileRoute("/combustiveis")({
  head: () => ({
    meta: [
      { title: "Combustíveis — Arretado de Barato" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Consulte preços de gasolina, etanol, diesel e GNV registrados em vendas de postos de Alagoas." },
      { property: "og:title", content: "Preços de combustíveis em Alagoas — Arretado de Barato" },
      { property: "og:description", content: "Gasolina, etanol, diesel e GNV: veja preços registrados em vendas recentes nos postos." },
    ],
  }),
  component: FuelPage,
});

function parseQty(s: string): number | null {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 100000 ? n : null;
}

function FuelPage() {
  const form = fuelFormStore.use();
  const state = fuelSearchStore.use();
  const { run } = useSearchRunner(fuelSearchStore, searchFuel);
  const [errors, setErrors] = useState<FieldErrors>({});
  const ids = { tipoErr: useId(), cnpj: useId(), qty: useId() };
  const set = (patch: Partial<typeof form>) => fuelFormStore.set((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!fuelFormStore.get().place) set({ place: initialPlace() });
  }, []);

  const buildQuery = (): FuelQuery | null => {
    const f = fuelFormStore.get();
    const place = toPlace(f.place ?? initialPlace(), f.cnpj);
    if (!place) return null;
    return {
      tipoCombustivel: f.tipo ?? 0,
      place,
      dias: f.dias,
      pagina: 1,
      registrosPorPagina: LIMITS.registrosDefault,
    };
  };
  const currentQuery = buildQuery();
  const canSearch = currentQuery !== null && validateFuelQuery(currentQuery).ok;

  const submit = () => {
    const f = fuelFormStore.get();
    const errs: FieldErrors = {};
    if (f.cnpj.trim()) {
      const e = validateCnpj(f.cnpj);
      if (e) errs.cnpj = e;
    }
    const q = buildQuery();
    if (!q) {
      setErrors({ place: "Escolha um município, use sua localização ou informe um CNPJ.", ...errs });
      return;
    }
    const v = validateFuelQuery(q);
    if (!v.ok || Object.keys(errs).length) {
      setErrors({ ...(v.ok ? {} : v.errors), ...errs });
      return;
    }
    setErrors({});
    void run(q, "new");
  };

  useEffect(() => {
    if (form.pendingRun && form.place) {
      set({ pendingRun: false });
      submit();
    }
  }, [form.pendingRun, form.place]);

  const qty = parseQty(form.quantidade);
  const units = [...new Set(state.items.map((i) => i.unidade))];
  const allErrors = { ...(state.error?.errors ?? {}), ...errors };

  const save = () => {
    const q = state.query;
    if (!q) return;
    favoritesStore.set((l) => [
      ...l,
      { id: uid(), kind: "combustivel", label: fuelName(q.tipoCombustivel), tipoCombustivel: q.tipoCombustivel, place: savedPlaceOf(q.place), dias: q.dias, savedAt: new Date().toISOString() },
    ]);
    toast.success("Pesquisa de combustível salva nos favoritos.");
  };

  if (!form.place) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold md:text-3xl">Preços de combustíveis</h1>
      <Link to="/assistente" search={{modo:"combustivel"}} className="inline-flex min-h-12 items-center rounded-lg border-2 border-primary px-4 font-semibold text-primary hover:bg-primary-soft">
        Assistente de voz — buscar combustíveis
      </Link>
      <ModeBanner />
      <form className="card-surface space-y-5 p-4 md:p-6" noValidate aria-label="Pesquisa de combustíveis"
        onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <fieldset>
          <legend className="text-lg font-semibold">Qual combustível?</legend>
          <div role="radiogroup" aria-describedby={allErrors.tipoCombustivel ? ids.tipoErr : undefined} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FUEL_TYPES.map((f) => (
              <Button key={f.codigo} type="button" variant="chip" role="radio" aria-checked={form.tipo === f.codigo}
                aria-pressed={form.tipo === f.codigo} className="justify-start whitespace-normal text-left" onClick={() => set({ tipo: f.codigo })}>
                {f.nome}
              </Button>
            ))}
          </div>
          <FieldError id={ids.tipoErr} message={allErrors.tipoCombustivel} />
        </fieldset>
        <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
          <PlaceSelector value={form.place} onChange={(p) => set({ place: p })} errors={allErrors} />
          <div className="space-y-4">
            <PeriodSelect value={form.dias} onChange={(d) => set({ dias: d })} />
            <div>
              <label htmlFor={ids.cnpj} className="block text-sm font-semibold">CNPJ do posto (opcional)</label>
              <Input id={ids.cnpj} inputMode="numeric" maxLength={14} value={form.cnpj}
                onChange={(e) => set({ cnpj: e.target.value.replace(/\D/g, "") })}
                aria-invalid={!!allErrors.cnpj} className="mt-1 min-h-11 border-2 border-input" />
              <p className="text-sm text-muted-foreground">Se preenchido, substitui o município ou a localização.</p>
              <FieldError message={allErrors.cnpj} />
            </div>
          </div>
        </div>
        {canSearch && (
          <Button type="submit" size="lg" disabled={state.status === "loading"}>
            <Search aria-hidden /> Pesquisar
          </Button>
        )}
      </form>

      {state.status === "success" && state.items.length > 0 && (
        <section aria-labelledby="calc-t" className="card-surface space-y-2 p-4">
          <h2 id="calc-t" className="flex items-center gap-2 text-lg font-bold">
            <Calculator aria-hidden className="size-5" /> Calculadora de abastecimento
          </h2>
          <label htmlFor={ids.qty} className="block text-sm font-semibold">
            Quantidade a abastecer {units.length === 1 ? `(em ${units[0]})` : "(na unidade mostrada em cada posto)"}
          </label>
          <Input id={ids.qty} inputMode="decimal" value={form.quantidade} onChange={(e) => set({ quantidade: e.target.value })}
            placeholder="Ex.: 40" className="max-w-48 min-h-11 border-2 border-input" />
          <p className="text-sm text-muted-foreground">
            A estimativa usa os preços registrados e aparece em cada posto abaixo. Não inclui o custo de deslocamento.
            {units.length > 1 && " Atenção: os postos usam unidades diferentes."}
          </p>
        </section>
      )}

      {state.status === "success" && state.query && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={save}><BookmarkPlus aria-hidden /> Salvar esta pesquisa</Button>
        </div>
      )}

      <ResultsSection
        state={state}
        kindLabel="combustíveis"
        onRetry={() => state.query && run({ ...state.query, pagina: 1 }, "new")}
        onLoadMore={() => state.query && state.meta && run({ ...state.query, pagina: state.meta.pagina + 1 }, "more")}
        extra={(r) =>
          qty ? (
            <p className="mt-1 rounded-b-lg bg-primary-soft px-4 py-2 text-sm text-accent-foreground">
              Estimativa para {String(qty).replace(".", ",")} {r.unidade}: <strong>{formatBRL(qty * r.valorVenda)}</strong>
            </p>
          ) : null
        }
      />
    </div>
  );
}
