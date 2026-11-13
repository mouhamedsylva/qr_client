import { describe, expect, it } from 'vitest';
import { defaultOrderMode, modeSummary, nameRequired, serviceWhere } from '~/utils/order-mode';

const table = { kind: 'TABLE' as const, label: 'Table 4' };
const counter = { kind: 'COUNTER' as const, label: 'Comptoir' };

describe('mode de commande', () => {
  it('propose sur place à table, à emporter au comptoir ou par lien', () => {
    expect(defaultOrderMode(table)).toBe('DINE_IN');
    expect(defaultOrderMode(counter)).toBe('TAKEAWAY');
    expect(defaultOrderMode(null)).toBe('TAKEAWAY');
  });

  it('décrit le lieu de service', () => {
    expect(modeSummary('DINE_IN', table)).toBe('Sur place · Table 4');
    expect(modeSummary('DINE_IN', counter)).toBe('Sur place · Comptoir');
    expect(modeSummary('DINE_IN', null)).toBe('Sur place · Comptoir');
    expect(modeSummary('TAKEAWAY', table)).toBe('À emporter');
    expect(serviceWhere('DINE_IN', table)).toBe('Table 4');
    expect(serviceWhere('DINE_IN', null)).toBe('Au comptoir');
    expect(serviceWhere('TAKEAWAY', table)).toBe('À retirer au comptoir');
  });

  it('demande le prénom quand la commande n’est pas servie à une table', () => {
    expect(nameRequired('DINE_IN', table)).toBe(false);
    expect(nameRequired('TAKEAWAY', table)).toBe(true);
    expect(nameRequired('DINE_IN', counter)).toBe(true);
    expect(nameRequired('DINE_IN', null)).toBe(true);
  });
});
