import { AlertCircle } from "lucide-react";

export function FieldError({ id, message }: { id?: string | undefined; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-destructive">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
