import type { ReactNode } from "react";
import { PlaceSelector, type PlaceState } from "@/components/eal/PlaceSelector";
import { PeriodSelect } from "@/components/eal/PeriodSelect";
import type { FieldErrors } from "@/lib/economiza/validation";

export function SearchLocationFields({
  place,
  dias,
  onPlaceChange,
  onDaysChange,
  errors,
  children,
}: {
  place: PlaceState;
  dias: number;
  onPlaceChange: (place: PlaceState) => void;
  onDaysChange: (days: number) => void;
  errors: FieldErrors;
  children?: ReactNode;
}) {
  return (
    <section className="border-t border-border/70 pt-5" aria-label="Local e período da pesquisa">
      <h2 className="mb-3 text-base font-semibold">Onde pesquisar?</h2>
      <div className="grid items-start gap-5 md:grid-cols-[2fr_1fr]">
        <PlaceSelector value={place} onChange={onPlaceChange} errors={errors} hideHeading />
        <div className="space-y-4">
          <PeriodSelect value={dias} onChange={onDaysChange} />
          {children}
        </div>
      </div>
    </section>
  );
}
