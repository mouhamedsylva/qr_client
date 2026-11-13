/** Mode de commande choisi par le client : sur place ou à emporter. */
import type { OrderMode } from '~/types/api';

type TableLike = { kind: 'TABLE' | 'COUNTER'; label: string } | null;

/** À une table : sur place par défaut ; au comptoir ou par lien : à emporter. */
export function defaultOrderMode(table: TableLike): OrderMode {
  return table?.kind === 'TABLE' ? 'DINE_IN' : 'TAKEAWAY';
}

/** Lieu de service : « Table 4 » sur place à table, « Au comptoir » sinon. */
export function serviceWhere(mode: OrderMode, table: TableLike): string {
  if (mode === 'DINE_IN') return table?.kind === 'TABLE' ? table.label : 'Au comptoir';
  return 'À retirer au comptoir';
}

/** Libellé court : « Sur place · Table 4 », « Sur place · Comptoir », « À emporter ». */
export function modeSummary(mode: OrderMode, table: TableLike): string {
  if (mode === 'TAKEAWAY') return 'À emporter';
  return table?.kind === 'TABLE' ? `Sur place · ${table.label}` : 'Sur place · Comptoir';
}

/** Prénom requis quand la commande n'est pas servie à une table (on appelle le client). */
export function nameRequired(mode: OrderMode, table: TableLike): boolean {
  return !(mode === 'DINE_IN' && table?.kind === 'TABLE');
}
