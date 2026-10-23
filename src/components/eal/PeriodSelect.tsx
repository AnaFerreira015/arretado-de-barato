import { useId } from "react";
import { LIMITS } from "@/lib/economiza/constants";

export function PeriodSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        Período das vendas
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 min-h-11 w-full rounded-lg border-2 border-input bg-card px-3"
      >
        {Array.from({ length: LIMITS.diasMax }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d === 1 ? "Último dia" : `Últimos ${d} dias`}
          </option>
        ))}
      </select>
    </div>
  );
}
