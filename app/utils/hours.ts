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

const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Jour (0 = dimanche) et minutes écoulées depuis minuit, dans le fuseau du restaurant. */
export function localClock(timeZone: string, now = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday ?? 'Sun'),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/**
 * Résumé court des horaires : « Ouvert · ferme à 23h00 », « Fermé · ouvre à 08h00 »,
 * « Fermé · ouvre demain à 08h00 ». Gère les créneaux qui passent minuit.
 */
export function openingSummary(slots: OpeningSlot[], day: number, minutes: number, isOpen: boolean): string {
  const prev = (day + 6) % 7;
  if (isOpen) {
    // Créneau en cours : aujourd'hui, ou commencé la veille et terminé après minuit.
    const current =
      slots.find((s) => {
        if (s.dayOfWeek !== day) return false;
        const o = toMinutes(s.opensAt);
        const c = toMinutes(s.closesAt);
        return c > o ? minutes >= o && minutes < c : minutes >= o;
      }) ??
      slots.find((s) => s.dayOfWeek === prev && toMinutes(s.closesAt) < toMinutes(s.opensAt) && minutes < toMinutes(s.closesAt));
    return current ? `Ouvert · ferme à ${hhmm(current.closesAt)}` : 'Ouvert';
  }
  const later = slots
    .filter((s) => s.dayOfWeek === day && toMinutes(s.opensAt) > minutes)
    .sort((a, b) => toMinutes(a.opensAt) - toMinutes(b.opensAt))[0];
  if (later) return `Fermé · ouvre à ${hhmm(later.opensAt)}`;
  for (let offset = 1; offset <= 7; offset++) {
    const d = (day + offset) % 7;
    const first = slots.filter((s) => s.dayOfWeek === d).sort((a, b) => toMinutes(a.opensAt) - toMinutes(b.opensAt))[0];
    if (first) {
      const when = offset === 1 ? 'demain' : DAY_NAMES[d]!.toLowerCase();
      return `Fermé · ouvre ${when} à ${hhmm(first.opensAt)}`;
    }
  }
  return 'Fermé';
}

/** Semaine complète, du lundi au dimanche. */
export function weekSchedule(slots: OpeningSlot[]): { day: number; name: string; label: string }[] {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, name: DAY_NAMES[day]!, label: slotsLabel(slots, day) }));
}
