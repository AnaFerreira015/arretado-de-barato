import type { SearchPage } from "./adapter";

function words(value: string): string[] {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Whole words avoid matching "coca" inside "paçoca" or "cocada". */
export function matchesProductName(description: string, query: string): boolean {
  const wanted = words(query);
  const available = new Set(words(description));
  return wanted.length > 0 && wanted.every((word) => available.has(word));
}

/** Preserve upstream counts and cursor: a filtered empty page may have a next page. */
export function filterProductPage(page: SearchPage, description: string | undefined): SearchPage {
  if (!description?.trim()) return page;
  return {
    ...page,
    nameFiltered: true,
    items: page.items.filter((item) => matchesProductName(item.descricao, description)
      || (!!item.descricaoSefaz && matchesProductName(item.descricaoSefaz, description))),
  };
}
