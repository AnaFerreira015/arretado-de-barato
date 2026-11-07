/** Aguarda a renderização dos erros antes de direcionar o foco. */
export function focusInvalidField(form: HTMLFormElement) {
  requestAnimationFrame(() => {
    if (!form.isConnected) return;
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
