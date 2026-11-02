import { useCallback, useEffect, useId, useState } from "react";
import { BookmarkPlus, Calculator, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialPlace } from "@/components/eal/PlaceSelector";
import { SearchLocationFields } from "./SearchLocationFields";
import { FieldError } from "@/components/eal/FieldError";
import { ResultsSection } from "@/components/eal/ResultsSection";
import { FUEL_TYPES, LIMITS, fuelName } from "@/lib/economiza/constants";
import { searchFuel } from "@/lib/economiza/api.functions";
import { fuelFormStore, fuelSearchStore, savedPlaceOf } from "@/lib/economiza/searchStores";
import { toPlace, useSearchRunner } from "@/lib/economiza/useSearch";
import {
  validateFuelQuery,
  validateCnpj,
  type FieldErrors,
  type FuelQuery,
} from "@/lib/economiza/validation";
import { formatBRL } from "@/lib/economiza/format";
import { favoritesStore, uid } from "@/lib/store";

function parseQty(s: string): number | null {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 100000 ? n : null;
}

export function FuelSearchPanel() {
  const form = fuelFormStore.use();
  const state = fuelSearchStore.use();
  const { run } = useSearchRunner(fuelSearchStore, searchFuel);
  const [errors, setErrors] = useState<FieldErrors>({});
  const ids = { tipoErr: useId(), cnpj: useId(), qty: useId() };
  const set = useCallback(
    (patch: Partial<typeof form>) => fuelFormStore.set((f) => ({ ...f, ...patch })),
    [],
  );

  useEffect(() => {
    if (!fuelFormStore.get().place) set({ place: initialPlace() });
  }, [set]);

  const buildQuery = useCallback((): FuelQuery | null => {
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
  }, []);

  const submit = useCallback(() => {
    const f = fuelFormStore.get();
    const errs: FieldErrors = {};
    if (f.cnpj.trim()) {
      const e = validateCnpj(f.cnpj);
      if (e) errs.cnpj = e;
    }
    const q = buildQuery();
    if (!q) {
      setErrors({
        place: "Escolha um município, use sua localização ou informe um CNPJ.",
        ...errs,
      });
      return;
    }
    const v = validateFuelQuery(q);
    if (!v.ok || Object.keys(errs).length) {
      setErrors({ ...(v.ok ? {} : v.errors), ...errs });
      return;
    }
    setErrors({});
    void run(q, "new");
  }, [buildQuery, run]);

  useEffect(() => {
    if (form.pendingRun && form.place) {
      set({ pendingRun: false });
      submit();
    }
  }, [form.pendingRun, form.place, set, submit]);

  const qty = parseQty(form.quantidade);
  const units = [...new Set(state.items.map((i) => i.unidade))];
  const allErrors = { ...(state.error?.errors ?? {}), ...errors };

  const save = () => {
    const q = state.query;
    if (!q) return;
    favoritesStore.set((l) => [
      ...l,
      {
        id: uid(),
        kind: "combustivel",
        label: fuelName(q.tipoCombustivel),
        tipoCombustivel: q.tipoCombustivel,
        place: savedPlaceOf(q.place),
        dias: q.dias,
        savedAt: new Date().toISOString(),
      },
    ]);
    toast.success("Pesquisa de combustível salva nos favoritos.");
  };

  if (!form.place) return null;

  return (
    <div className="space-y-4">
      <form
        className="card-surface space-y-5 p-4 md:p-6"
        noValidate
        aria-label="Pesquisa de combustíveis"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset>
          <legend className="text-lg font-semibold">Qual combustível?</legend>
          <div
            role="radiogroup"
            aria-describedby={allErrors.tipoCombustivel ? ids.tipoErr : undefined}
            className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {FUEL_TYPES.map((f) => (
              <Button
                key={f.codigo}
                type="button"
                variant="chip"
                role="radio"
                aria-checked={form.tipo === f.codigo}
                aria-pressed={form.tipo === f.codigo}
                className="justify-start whitespace-normal text-left"
                onClick={() => set({ tipo: f.codigo })}
              >
                {f.nome}
              </Button>
            ))}
          </div>
          <FieldError id={ids.tipoErr} message={allErrors.tipoCombustivel} />
        </fieldset>
        <SearchLocationFields
          place={form.place}
          dias={form.dias}
          onPlaceChange={(p) => set({ place: p })}
          onDaysChange={(dias) => set({ dias })}
          errors={allErrors}
        />
        <details open={allErrors.cnpj ? true : undefined} className="rounded-xl border p-4">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">
            Filtros avançados{form.cnpj ? " · CNPJ preenchido" : ""}
          </summary>
          <label htmlFor={ids.cnpj} className="block text-sm font-semibold">
            CNPJ do posto (opcional)
          </label>
          <Input
            id={ids.cnpj}
            inputMode="numeric"
            maxLength={14}
            value={form.cnpj}
            onChange={(e) => set({ cnpj: e.target.value.replace(/\D/g, "") })}
            aria-invalid={!!allErrors.cnpj}
            className="mt-2 min-h-11 max-w-sm border-2 border-input"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Se preenchido, substitui o município ou a localização.
          </p>
          <FieldError message={allErrors.cnpj} />
        </details>
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={state.status === "loading"}
        >
          <Search aria-hidden /> Pesquisar
        </Button>
      </form>

      {state.status === "success" && state.items.length > 0 && (
        <section aria-labelledby="calc-t" className="card-surface space-y-2 p-4">
          <h2 id="calc-t" className="flex items-center gap-2 text-lg font-bold">
            <Calculator aria-hidden className="size-5" /> Calculadora de abastecimento
          </h2>
          <label htmlFor={ids.qty} className="block text-sm font-semibold">
            Quantidade a abastecer{" "}
            {units.length === 1 ? `(em ${units[0]})` : "(na unidade mostrada em cada posto)"}
          </label>
          <Input
            id={ids.qty}
            inputMode="decimal"
            value={form.quantidade}
            onChange={(e) => set({ quantidade: e.target.value })}
            placeholder="Ex.: 40"
            className="max-w-48 min-h-11 border-2 border-input"
          />
          <p className="text-sm text-muted-foreground">
            A estimativa usa os preços registrados e aparece em cada posto abaixo. Não inclui o
            custo de deslocamento.
            {units.length > 1 && " Atenção: os postos usam unidades diferentes."}
          </p>
        </section>
      )}

      {state.status === "success" && state.query && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={save}>
            <BookmarkPlus aria-hidden /> Salvar esta pesquisa
          </Button>
        </div>
      )}

      <ResultsSection
        state={state}
        kindLabel="combustíveis"
        onRetry={() => state.query && run({ ...state.query, pagina: 1 }, "new")}
        onLoadMore={() =>
          state.query &&
          state.meta &&
          run({ ...state.query, pagina: state.meta.pagina + 1 }, "more")
        }
        extra={(r) =>
          qty ? (
            <p className="mt-1 rounded-b-lg bg-primary-soft px-4 py-2 text-sm text-accent-foreground">
              Estimativa para {String(qty).replace(".", ",")} {r.unidade}:{" "}
              <strong>{formatBRL(qty * r.valorVenda)}</strong>
            </p>
          ) : null
        }
      />
    </div>
  );
}
