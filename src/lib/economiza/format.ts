import { TIMEZONE } from "./constants";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlFuel = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

export const formatBRL = (v: number) => brl.format(v);
/** Fuel prices keep up to 3 decimals (e.g. R$ 5,899). */
export const formatFuelBRL = (v: number) => brlFuel.format(v);

const dtf = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** API dates are UTC ISO 8601 ("Z" may be missing per the manual): treat as UTC. */
export function parseUtc(iso: string): Date {
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso);
  return new Date(hasZone ? iso : `${iso}Z`);
}

export function formatDateTime(iso: string): string {
  const d = parseUtc(iso);
  if (Number.isNaN(d.getTime())) return "Data não informada";
  return dtf.format(d).replace(",", " às");
}

export function relativeDays(iso: string, now = new Date()): string {
  const d = parseUtc(iso);
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diff <= 0) return "hoje";
  if (diff === 1) return "há 1 dia";
  return `há ${diff} dias`;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace(".", ",")} km`;
}

export function formatCnpj(c: string) {
  return /^\d{14}$/.test(c) ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : c;
}
