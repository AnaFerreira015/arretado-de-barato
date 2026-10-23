import { useId, useState } from "react";
import { Check, ChevronsUpDown, LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { LIMITS, MUNICIPIOS, municipioNome } from "@/lib/economiza/constants";
import { prefsStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { FieldError } from "./FieldError";

export type PlaceState = {
  mode: "municipio" | "geo";
  municipio: number | null;
  raio: number;
  coords: { lat: number; lng: number } | null;
};

export const initialPlace = (): PlaceState => {
  const p = prefsStore.get();
  return { mode: "municipio", municipio: p.remember ? p.municipio : null, raio: LIMITS.raioDefault, coords: null };
};

export function PlaceSelector({
  value,
  onChange,
  errors,
}: {
  value: PlaceState;
  onChange: (v: PlaceState) => void;
  errors: FieldErrors;
}) {
  const [open, setOpen] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "denied" | "error">("idle");
  const prefs = prefsStore.use();
  const ids = { label: useId(), err: useId(), raio: useId(), geo: useId() };
  const munErr = errors.municipio || errors.place;
  const geoErr = errors.geolocalizacao;

  const useLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus("idle");
        onChange({ ...value, mode: "geo", coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
      },
      (err) => {
        setGeoStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
        onChange({ ...value, mode: "municipio", coords: null });
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 },
    );
  };

  const pick = (codigo: number) => {
    onChange({ ...value, mode: "municipio", municipio: codigo, coords: null });
    if (prefs.remember) prefsStore.set((p) => ({ ...p, municipio: codigo }));
    setOpen(false);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-base font-semibold">Onde pesquisar?</legend>

      {value.mode === "geo" && value.coords ? (
        <div className="rounded-lg border-2 border-primary bg-primary-soft p-3">
          <p className="flex items-center gap-2 font-semibold text-accent-foreground">
            <LocateFixed aria-hidden className="size-5" /> Usando sua localização atual
          </p>
          <div className="mt-3">
            <label htmlFor={ids.raio} className="text-sm font-semibold">
              Distância máxima: {value.raio} km
            </label>
            <Slider
              id={ids.raio}
              className="mt-3"
              min={LIMITS.raioMin}
              max={LIMITS.raioMax}
              step={1}
              value={[value.raio]}
              onValueChange={([r]) => onChange({ ...value, raio: r })}
              aria-label={`Distância máxima, ${value.raio} quilômetros`}
            />
            <div className="mt-1 flex justify-between text-sm text-muted-foreground" aria-hidden>
              <span>1 km</span>
              <span>15 km</span>
            </div>
            <FieldError message={errors.raio} />
          </div>
          <Button type="button" variant="link" className="mt-1 px-0" onClick={() => onChange({ ...value, mode: "municipio", coords: null })}>
            Escolher um município
          </Button>
        </div>
      ) : (
        <div>
          <span id={ids.label} className="mb-1 block text-sm font-semibold">
            Município
          </span>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                aria-labelledby={ids.label}
                aria-describedby={munErr ? ids.err : undefined}
                aria-invalid={!!munErr}
                className={cn("w-full justify-between font-normal", munErr && "border-destructive")}
              >
                <span className="flex items-center gap-2 truncate">
                  <MapPin aria-hidden />
                  {value.municipio ? municipioNome(value.municipio) : "Escolha o município"}
                </span>
                <ChevronsUpDown aria-hidden className="opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Digite o nome do município" aria-label="Buscar município" />
                <CommandList>
                  <CommandEmpty>Nenhum município encontrado.</CommandEmpty>
                  <CommandGroup>
                    {MUNICIPIOS.map((m) => (
                      <CommandItem key={m.codigo} value={m.nome} onSelect={() => pick(m.codigo)} className="min-h-11 text-base">
                        <Check aria-hidden className={cn("size-4", value.municipio === m.codigo ? "opacity-100" : "opacity-0")} />
                        {m.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FieldError id={ids.err} message={munErr} />

          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              checked={prefs.remember}
              onCheckedChange={(c) =>
                prefsStore.set((p) => ({ ...p, remember: c === true, municipio: c === true ? value.municipio : null }))
              }
              className="size-5"
            />
            Lembrar este município neste aparelho
          </label>

          <div className="mt-1">
            <Button type="button" variant="outline" onClick={useLocation} disabled={geoStatus === "loading"} aria-describedby={ids.geo}>
              <LocateFixed aria-hidden />
              {geoStatus === "loading" ? "Obtendo localização…" : "Usar minha localização"}
            </Button>
            <p id={ids.geo} className="mt-1 text-sm text-muted-foreground" role={geoStatus === "denied" || geoStatus === "error" ? "alert" : undefined}>
              {geoStatus === "denied"
                ? "Permissão de localização negada. Você pode continuar escolhendo um município."
                : geoStatus === "error"
                  ? "Não foi possível obter sua localização. Escolha um município."
                  : "Só usamos sua localização se você pedir. Ela não é salva."}
            </p>
            <FieldError message={geoErr} />
          </div>
        </div>
      )}
    </fieldset>
  );
}
