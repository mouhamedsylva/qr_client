/** Suivi de commande côté client : libellés, étapes et règles d'action. */
import type { OrderMode, OrderStatus, PaymentStatus } from '~/types/api';

type Color = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export const STATUS: Record<OrderStatus, { label: string; color: Color; icon: string; hint: string }> = {
  PENDING: { label: 'Envoyée', color: 'warning', icon: 'i-lucide-send', hint: 'Le restaurant va confirmer votre commande.' },
  ACCEPTED: { label: 'Confirmée', color: 'info', icon: 'i-lucide-circle-check', hint: 'Votre commande est confirmée.' },
  PREPARING: { label: 'En préparation', color: 'primary', icon: 'i-lucide-chef-hat', hint: 'La cuisine prépare votre commande.' },
  READY: { label: 'Prête', color: 'success', icon: 'i-lucide-bell-ring', hint: '' },
  SERVED: { label: 'Servie', color: 'success', icon: 'i-lucide-utensils', hint: 'Bon appétit !' },
  COMPLETED: { label: 'Terminée', color: 'neutral', icon: 'i-lucide-check-check', hint: 'Merci de votre visite !' },
  CANCELLED: { label: 'Annulée', color: 'error', icon: 'i-lucide-circle-x', hint: 'Cette commande a été annulée.' },
  REJECTED: { label: 'Refusée', color: 'error', icon: 'i-lucide-ban', hint: 'Le restaurant n’a pas pu accepter cette commande.' },
};

/** Message « prête » selon le mode : servie à table ou à retirer. */
export function readyHint(mode: OrderMode): string {
  return mode === 'DINE_IN' ? 'Elle arrive à votre table.' : 'Vous pouvez la retirer au comptoir.';
}

/** Étapes de la frise de suivi. */
export const STEPS: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'];

/** Index de l'étape atteinte (-1 si annulée ou refusée). */
export function stepIndex(status: OrderStatus): number {
  if (status === 'COMPLETED') return STEPS.length - 1;
  return STEPS.indexOf(status);
}

export const isClosed = (s: OrderStatus) => s === 'COMPLETED' || s === 'CANCELLED' || s === 'REJECTED';
export const isFailed = (s: OrderStatus) => s === 'CANCELLED' || s === 'REJECTED';

/** Le client ne peut annuler que tant que le restaurant n'a pas pris la commande (CMD-08). */
export const canCancel = (s: OrderStatus) => s === 'PENDING';

/** Ajout d'articles (CMD-06) : commande ouverte, sur place, pas encore réglée. */
export function canAddItems(s: OrderStatus, mode: OrderMode, payment: PaymentStatus): boolean {
  return !isClosed(s) && mode === 'DINE_IN' && payment !== 'PAID';
}

/** Avis possible une fois la commande servie (CLI-03). */
export const canReview = (s: OrderStatus) => s === 'SERVED' || s === 'COMPLETED';

/** Plus rien à payer. */
export const isSettled = (p: PaymentStatus) => p === 'PAID' || p === 'PARTIALLY_REFUNDED' || p === 'REFUNDED';

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; color: Color }> = {
  UNPAID: { label: 'À régler', color: 'warning' },
  PENDING: { label: 'Paiement en cours', color: 'info' },
  PARTIALLY_PAID: { label: 'Partiellement réglée', color: 'warning' },
  PAID: { label: 'Réglée', color: 'success' },
  PARTIALLY_REFUNDED: { label: 'Remboursée en partie', color: 'neutral' },
  REFUNDED: { label: 'Remboursée', color: 'neutral' },
};

export const MODE_LABEL: Record<OrderMode, string> = { DINE_IN: 'Sur place', TAKEAWAY: 'À emporter' };
