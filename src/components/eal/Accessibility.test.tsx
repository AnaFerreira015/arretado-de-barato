import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaceSelector } from "./PlaceSelector";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { focusInvalidField } from "@/lib/accessibility";

afterEach(cleanup);
describe("acessibilidade dos controles compartilhados", () => {
  it("associa o nome e o clique do rótulo à preferência de município", () => {
    render(
      <PlaceSelector
        value={{ mode: "municipio", municipio: null, raio: 5, coords: null }}
        errors={{}}
        onChange={vi.fn()}
      />,
    );
    const checkbox = screen.getByRole("checkbox", {
      name: "Lembrar este município neste aparelho",
    });
    expect(checkbox).toHaveAccessibleName("Lembrar este município neste aparelho");
    const before = checkbox.getAttribute("aria-checked");
    fireEvent.click(screen.getByText("Lembrar este município neste aparelho"));
    expect(checkbox.getAttribute("aria-checked")).not.toBe(before);
  });
  it("expõe distância, unidade e erro no controle de faixa nativo", () => {
    const change = vi.fn();
    render(
      <PlaceSelector
        value={{ mode: "geo", municipio: null, raio: 5, coords: { lat: -9, lng: -35 } }}
        errors={{ raio: "Distância inválida" }}
        onChange={change}
      />,
    );
    const range = screen.getByRole("slider", { name: "Distância máxima: 5 km" });
    expect(range).toHaveAttribute("aria-valuetext", "5 quilômetros");
    expect(range).toHaveAccessibleDescription("Distância inválida");
    fireEvent.change(range, { target: { value: "6" } });
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ raio: 6 }));
  });
  it("mantém IDs diferentes quando há dois seletores", () => {
    const props = {
      value: { mode: "municipio" as const, municipio: null, raio: 5, coords: null },
      errors: {},
      onChange: vi.fn(),
    };
    render(
      <>
        <PlaceSelector {...props} />
        <PlaceSelector {...props} />
      </>,
    );
    const controls = screen.getAllByRole("checkbox");
    expect(controls[0]!.id).not.toBe(controls[1]!.id);
  });
  it("oferece botão de fechar em português no diálogo", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Detalhes</DialogTitle>
          <DialogDescription>Dados do produto</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
  });
  it("foca o primeiro campo inválido depois que os erros são renderizados", () => {
    const frame = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const { container } = render(
      <form>
        <input aria-label="Item" aria-invalid="true" />
        <input aria-label="Quantidade" aria-invalid="true" />
      </form>,
    );
    focusInvalidField(container.querySelector("form")!);
    expect(screen.getByRole("textbox", { name: "Item" })).toHaveFocus();
    frame.mockRestore();
  });
});
