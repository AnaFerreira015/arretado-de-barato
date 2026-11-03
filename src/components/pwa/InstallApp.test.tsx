import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { InstallApp } from "./InstallApp";
import { PwaStatus } from "./PwaStatus";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function offer(outcome: "accepted" | "dismissed" = "dismissed", fail = false) {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  const prompt = fail
    ? vi.fn().mockRejectedValue(new Error("blocked"))
    : vi.fn().mockResolvedValue(undefined);
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  act(() => {
    window.dispatchEvent(event);
  });
  return { event, prompt };
}
it("oferece instruções manuais sem prometer suporte", () => {
  render(<InstallApp />);
  expect(screen.queryByRole("button", { name: "Instalar aplicativo" })).not.toBeInTheDocument();
  expect(screen.getByText(/No iPhone ou iPad/)).toBeInTheDocument();
});
it.each(["accepted", "dismissed"] as const)("consome o convite uma vez: %s", async (outcome) => {
  render(<InstallApp />);
  const { event, prompt } = offer(outcome);
  expect(event.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Instalar aplicativo" }));
  await waitFor(() => expect(screen.queryByRole("button")).not.toBeInTheDocument());
  expect(prompt).toHaveBeenCalledOnce();
  expect(screen.getByRole("status")).toHaveTextContent(
    outcome === "accepted" ? /Instalação solicitada/ : /instalar depois/,
  );
});
it("trata falha do navegador e mantém instruções", async () => {
  render(<InstallApp />);
  offer("dismissed", true);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/Não foi possível/));
});
it("esconde convite quando a instalação termina", () => {
  render(<InstallApp />);
  offer();
  act(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByText(/Como instalar/)).not.toBeInTheDocument();
});
it("não oferece instalação em janela standalone", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const { container } = render(<InstallApp />);
  expect(container).toBeEmptyDOMElement();
});
it("avisa perda de conexão e remove aviso ao reconectar", () => {
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  render(<PwaStatus />);
  online.mockReturnValue(false);
  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
  expect(screen.getByRole("status")).toHaveTextContent(/sem conexão/);
  online.mockReturnValue(true);
  act(() => {
    window.dispatchEvent(new Event("online"));
  });
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});
