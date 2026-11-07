export type ClassValue = string | false | null | undefined;

/** Combina classes CSS sem gerar valores vazios ou duplicados. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
