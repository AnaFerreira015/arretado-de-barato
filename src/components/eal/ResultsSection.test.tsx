import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResultsSection } from "./ResultsSection";
import type { SearchState } from "@/lib/economiza/useSearch";

vi.mock("./RecordDetailDialog", () => ({ RecordDetailDialog: () => null }));
vi.mock("./RecordCard", () => ({ RecordCard: () => null }));
vi.mock("./Notices", () => ({ DataNotice: () => null, ErrorState: ({ onRetry }: { onRetry: () => void }) => <button onClick={onRetry}>Tentar novamente</button> }));
afterEach(cleanup);
const state: SearchState<unknown> = {
  status: "success", query: {}, items: [], invalidCount: 0, examinedCount: 50,
  meta: { totalRegistros: 100, totalPaginas: 2, pagina: 1, registrosPorPagina: 50, registrosPagina: 50, primeiraPagina: true, ultimaPagina: false, nameFiltered: true },
  fetchedAt: null, cached: false, demo: false, origin: null, error: null,
};
describe("filtered result pagination", () => {
  it("allows loading the next page even when every record was filtered out", () => {
    const more = vi.fn();
    render(<ResultsSection state={state} kindLabel="produtos" onLoadMore={more} onRetry={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    expect(more).toHaveBeenCalledOnce();
    expect(screen.getAllByText("0 correspondências entre 50 registros consultados.").length).toBeGreaterThan(0);
  });
  it("retries the next page after a failed load following an empty filtered page", () => {
    const more = vi.fn(); const restart = vi.fn();
    render(<ResultsSection state={{ ...state, status: "error", error: { message: "Falha" } }} kindLabel="produtos" onLoadMore={more} onRetry={restart} />);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(more).toHaveBeenCalledOnce();
    expect(restart).not.toHaveBeenCalled();
  });
  it("stops pagination only at the last upstream page", () => {
    render(<ResultsSection state={{ ...state, meta: { ...state.meta!, ultimaPagina: true } }} kindLabel="produtos" onLoadMore={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
  });
});
