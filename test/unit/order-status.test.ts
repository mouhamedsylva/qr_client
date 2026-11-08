import { describe, expect, it } from 'vitest';
import { slotsLabel, weekSchedule } from '~/utils/hours';
import { canAddItems, canCancel, canReview, isSettled, stepIndex } from '~/utils/order-status';
import { matches } from '~/utils/text';

describe('suivi de commande', () => {
  it('place la commande sur la frise', () => {
    expect(stepIndex('PENDING')).toBe(0);
    expect(stepIndex('READY')).toBe(3);
    expect(stepIndex('COMPLETED')).toBe(4);
    expect(stepIndex('CANCELLED')).toBe(-1);
  });

  it('n’autorise l’annulation qu’avant la prise en charge', () => {
    expect(canCancel('PENDING')).toBe(true);
    expect(canCancel('ACCEPTED')).toBe(false);
  });

  it('autorise l’ajout d’articles sur place, commande ouverte et non réglée', () => {
    expect(canAddItems('PREPARING', 'DINE_IN', 'UNPAID')).toBe(true);
    expect(canAddItems('PREPARING', 'TAKEAWAY', 'UNPAID')).toBe(false);
    expect(canAddItems('SERVED', 'DINE_IN', 'PAID')).toBe(false);
    expect(canAddItems('CANCELLED', 'DINE_IN', 'UNPAID')).toBe(false);
  });

  it('propose l’avis une fois servie, et le reçu une fois réglée', () => {
    expect(canReview('SERVED')).toBe(true);
    expect(canReview('READY')).toBe(false);
    expect(isSettled('PAID')).toBe(true);
    expect(isSettled('PARTIALLY_PAID')).toBe(false);
  });
});

describe('horaires', () => {
  const slots = [
    { dayOfWeek: 1, opensAt: '12:00', closesAt: '15:00' },
    { dayOfWeek: 1, opensAt: '19:00', closesAt: '01:00' },
  ];
  it('affiche les créneaux du jour', () => {
    expect(slotsLabel(slots, 1)).toBe('12h00 – 15h00 · 19h00 – 01h00');
    expect(slotsLabel(slots, 2)).toBe('Fermé');
  });
  it('commence la semaine le lundi', () => {
    expect(weekSchedule(slots).map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});

describe('recherche', () => {
  it('ignore la casse et les accents', () => {
    expect(matches('creme', 'Crème brûlée')).toBe(true);
    expect(matches('THIEB', null, 'Thiéboudienne au poisson')).toBe(true);
    expect(matches('yassa', 'Mafé')).toBe(false);
    expect(matches('  ', 'Mafé')).toBe(true);
  });
});
