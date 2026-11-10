import { describe, expect, it } from 'vitest';
import { localClock, openingSummary, slotsLabel, weekSchedule } from '~/utils/hours';
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
  it('résume l’état d’ouverture', () => {
    // Lundi 13h : ouvert jusqu'à 15h.
    expect(openingSummary(slots, 1, 13 * 60, true)).toBe('Ouvert · ferme à 15h00');
    // Lundi 16h : fermé, réouverture à 19h.
    expect(openingSummary(slots, 1, 16 * 60, false)).toBe('Fermé · ouvre à 19h00');
    // Mardi 0h30 : créneau du lundi soir qui court jusqu'à 1h.
    expect(openingSummary(slots, 2, 30, true)).toBe('Ouvert · ferme à 01h00');
    // Mardi 10h : prochain créneau lundi prochain.
    expect(openingSummary(slots, 2, 10 * 60, false)).toBe('Fermé · ouvre lundi à 12h00');
    // Dimanche 10h : ouvre demain.
    expect(openingSummary(slots, 0, 10 * 60, false)).toBe('Fermé · ouvre demain à 12h00');
  });

  it('lit l’heure locale du restaurant', () => {
    // 2026-11-09 est un lundi ; 12h00 UTC = 12h00 à Dakar.
    expect(localClock('Africa/Dakar', new Date('2026-11-09T12:00:00Z'))).toEqual({ day: 1, minutes: 720 });
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
