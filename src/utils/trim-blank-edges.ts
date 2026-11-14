/**
 * Remove itens considerados vazios apenas nas extremidades da lista.
 * O conteúdo interno é mantido intacto.
 */
export function trimBlankEdges<T>(items: readonly T[], isBlank: (item: T) => boolean): T[] {
  let start = 0;
  let end = items.length;

  while (start < end && isBlank(items[start] as T)) start += 1;
  while (end > start && isBlank(items[end - 1] as T)) end -= 1;

  return items.slice(start, end);
}
