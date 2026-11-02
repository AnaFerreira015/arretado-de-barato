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
    <div className="grid gap-5 border-t border-border/70 pt-5 md:grid-cols-[2fr_1fr]">
      <PlaceSelector value={place} onChange={onPlaceChange} errors={errors} />
      <div className="space-y-4">
        <PeriodSelect value={dias} onChange={onDaysChange} />
        {children}
      </div>
    </div>
  );
}
