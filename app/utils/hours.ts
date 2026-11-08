/** Horaires d'ouverture affichés au client, dans le fuseau du restaurant. */
import type { OpeningSlot } from '~/types/api';

export const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Jour de la semaine (0 = dimanche) à l'instant donné, dans le fuseau indiqué. */
export function localDay(timeZone: string, now = new Date()): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

const hhmm = (v: string) => v.replace(':', 'h');

/** « 12h00 – 15h00 · 19h00 – 23h30 », ou « Fermé ». */
export function slotsLabel(slots: OpeningSlot[], day: number): string {
  const today = slots.filter((s) => s.dayOfWeek === day);
  if (!today.length) return 'Fermé';
  return today.map((s) => `${hhmm(s.opensAt)} – ${hhmm(s.closesAt)}`).join(' · ');
}

/** Semaine complète, du lundi au dimanche. */
export function weekSchedule(slots: OpeningSlot[]): { day: number; name: string; label: string }[] {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, name: DAY_NAMES[day]!, label: slotsLabel(slots, day) }));
}
