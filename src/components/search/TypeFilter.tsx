import { useId } from "react";
import { Fuel, ShoppingBasket, Layers3 } from "lucide-react";
export type ItemType = "todos" | "produto" | "combustivel";
export function TypeFilter({
  value,
  onChange,
  includeAll = false,
  label = "O que você quer pesquisar?",
}: {
  value: ItemType;
  onChange: (value: ItemType) => void;
  includeAll?: boolean;
  label?: string;
}) {
  const name = useId();
  const options = [
    ...(includeAll ? [{ value: "todos" as const, label: "Todos", icon: Layers3 }] : []),
    { value: "produto" as const, label: "Produtos", icon: ShoppingBasket },
    { value: "combustivel" as const, label: "Combustíveis", icon: Fuel },
  ];
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-bold text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="relative flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-3 font-bold has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring sm:flex-none"
          >
            <input
              className="sr-only"
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <option.icon className="size-5 shrink-0" aria-hidden />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
