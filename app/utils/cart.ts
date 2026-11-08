/** Règles du panier, alignées sur celles de l'API (qr_api/src/orders/order-lines.ts). */
import type { MenuItem, MenuOptionGroup } from '~/types/api';

export interface CartLine {
  /** Identifiant local : même article + mêmes options + même note = même ligne. */
  key: string;
  menuItemId: string;
  name: string;
  image: string | null;
  /** Prix unitaire options comprises, en plus petite unité. */
  unitPrice: number;
  quantity: number;
  optionIds: string[];
  /** « Sauce : piment » — pour l'affichage. */
  optionLabels: string[];
  notes: string;
}

export const MAX_QUANTITY = 50;

export function lineKey(menuItemId: string, optionIds: string[], notes = ''): string {
  return [menuItemId, [...optionIds].sort().join(','), notes.trim()].join('|');
}

/** Prix unitaire d'un article avec les options choisies. */
export function unitPrice(item: MenuItem, optionIds: string[]): number {
  const chosen = new Set(optionIds);
  let price = item.priceAmount;
  for (const group of item.optionGroups) {
    for (const option of group.options) {
      if (chosen.has(option.id)) price += option.priceDelta;
    }
  }
  return price;
}

/** Nombre minimal de choix : un groupe obligatoire en exige au moins un. */
export function minChoices(group: MenuOptionGroup): number {
  return Math.max(group.minSelect, group.isRequired ? 1 : 0);
}

/** Groupe à choix unique : boutons radio plutôt que cases à cocher. */
export function isSingleChoice(group: MenuOptionGroup): boolean {
  return group.maxSelect === 1;
}

/** Consigne affichée à côté du nom du groupe. */
export function groupHint(group: MenuOptionGroup): string {
  const min = minChoices(group);
  const max = group.maxSelect;
  if (min === 0) return max === 1 ? 'Facultatif' : `Facultatif · jusqu'à ${max}`;
  if (min === max) return min === 1 ? 'Obligatoire' : `Obligatoire · ${min} choix`;
  return `Obligatoire · ${min} à ${max} choix`;
}

/** Groupes dont la sélection est invalide (id du groupe → message). */
export function selectionErrors(item: MenuItem, optionIds: string[]): Record<string, string> {
  const chosen = new Set(optionIds);
  const errors: Record<string, string> = {};
  for (const group of item.optionGroups) {
    const count = group.options.filter((o) => chosen.has(o.id)).length;
    const min = minChoices(group);
    if (count < min) {
      errors[group.id] = min === 1 ? 'Faites un choix' : `Choisissez au moins ${min} options`;
    } else if (count > group.maxSelect) {
      errors[group.id] = `${group.maxSelect} choix maximum`;
    }
  }
  return errors;
}

/** Libellés des options choisies, dans l'ordre du menu. */
export function optionLabels(item: MenuItem, optionIds: string[]): string[] {
  const chosen = new Set(optionIds);
  return item.optionGroups.flatMap((g) =>
    g.options.filter((o) => chosen.has(o.id)).map((o) => `${g.name} : ${o.name}`),
  );
}

/** Coche ou décoche une option en respectant le maximum du groupe. */
export function toggleOption(group: MenuOptionGroup, selected: string[], optionId: string): string[] {
  const groupIds = new Set(group.options.map((o) => o.id));
  const inGroup = selected.filter((id) => groupIds.has(id));
  const others = selected.filter((id) => !groupIds.has(id));
  if (inGroup.includes(optionId)) {
    return [...others, ...inGroup.filter((id) => id !== optionId)];
  }
  if (isSingleChoice(group)) return [...others, optionId];
  if (inGroup.length >= group.maxSelect) return selected;
  return [...others, ...inGroup, optionId];
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.quantity, 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
}
