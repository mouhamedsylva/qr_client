/** Réponses de l'API publique QR-Order utilisées par l'application client. */

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface Me {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ───────────────────────── Établissement et menu ─────────────────────────

export interface OpeningSlot {
  dayOfWeek: number; // 0 = dimanche
  opensAt: string; // HH:mm
  closesAt: string;
}

export interface PublicRestaurant {
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  socialLinks: Record<string, string> | null;
  brandColors: { primary?: string; secondary?: string } | null;
  menuTheme: 'LIGHT' | 'DARK';
  currency: string;
  locale: string;
  timezone: string;
  taxEnabled: boolean;
  taxRateBp: number;
  pricesIncludeTax: boolean;
  serviceFeeBp: number;
  openingHours: OpeningSlot[];
  isOpen: boolean;
  reason: 'CLOSURE' | 'OUTSIDE_HOURS' | null;
}

export interface MenuOption {
  id: string;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceAmount: number;
  images: string[];
  prepTimeMinutes: number | null;
  allergens: string[];
  dietaryTags: string[];
  calories: number | null;
  available: boolean;
  optionGroups: MenuOptionGroup[];
}

export interface MenuCategory {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  items: MenuItem[];
  children?: MenuCategory[];
}

export interface PublicMenu {
  currency: string;
  categories: MenuCategory[];
}

export interface QrResolution {
  restaurant: PublicRestaurant;
  table: { id: string; label: string; kind: 'TABLE' | 'COUNTER' };
  menu: PublicMenu;
}

// ───────────────────────── Commandes ─────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export type OrderMode = 'DINE_IN' | 'TAKEAWAY';

export type PaymentStatus =
  | 'UNPAID'
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export interface LineOption {
  groupName: string;
  name: string;
  priceDelta: number;
}

/** Ligne envoyée à l'API (CMD-05). */
export interface OrderLineInput {
  menuItemId: string;
  quantity: number;
  optionIds?: string[];
  notes?: string;
}

export interface Quote {
  currency: string;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    options: LineOption[];
    lineTotal: number;
  }[];
  promoCode: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  serviceFee: number;
  tipAmount: number;
  total: number;
}

export interface CustomerOrder {
  id: string;
  number: number;
  status: OrderStatus;
  mode: OrderMode;
  table: { label: string } | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    options: LineOption[];
    notes: string | null;
    lineTotal: number;
    batch: number;
  }[];
  currency: string;
  subtotal: number;
  discountTotal: number;
  promoCode: string | null;
  taxTotal: number;
  serviceFee: number;
  tipAmount: number;
  total: number;
  paymentStatus: PaymentStatus;
  estimatedReadyAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface CreatedOrder {
  order: CustomerOrder;
  trackingToken: string;
}

export interface AccountOrder extends CustomerOrder {
  restaurant: { name: string; slug: string; logoUrl: string | null };
  reviewed: boolean;
  trackingToken: string;
}

export interface ReorderResult {
  restaurant: { id: string; name: string; slug: string };
  items: OrderLineInput[];
  unavailable: { name: string; reason: string }[];
}

// ───────────────────────── Paiements ─────────────────────────

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY';

export interface PaymentSummary {
  paymentStatus: PaymentStatus;
  total: number;
  amountDue: number;
  currency: string;
  payments: {
    id: string;
    method: PaymentMethod;
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    amount: number;
    refundedAmount: number;
    createdAt: string;
  }[];
}

export interface PaymentInitiation {
  paymentId: string;
  provider: 'STRIPE' | 'SANDBOX' | 'CASH';
  method: PaymentMethod;
  status: string;
  amount: number;
  currency: string;
  clientSecret?: string;
  redirectUrl?: string;
}

export interface Receipt {
  receiptNumber: string;
  issuedAt: string;
  restaurant: { name: string; address: string | null; city: string | null; phone: string | null; email: string | null; taxEnabled: boolean };
  order: { number: number; mode: OrderMode; table: string | null; createdAt: string };
  items: { name: string; quantity: number; unitPrice: number; options: string[]; lineTotal: number }[];
  currency: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  taxRateBp: number;
  pricesIncludeTax: boolean;
  serviceFee: number;
  tipAmount: number;
  total: number;
  payments: { method: PaymentMethod; operator: string | null; amount: number; paidAt: string }[];
}

// ───────────────────────── Avis et fidélité ─────────────────────────

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface ReviewList extends Paginated<PublicReview> {
  averageRating: number | null;
  distribution: Record<string, number>;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description?: string | null;
  pointsCost: number;
  [key: string]: unknown;
}

export type LoyaltyProgram =
  | { active: false }
  | { active: true; pointsPerUnit: number; unitAmount: number; expiryDays: number | null; rewards: LoyaltyReward[] };

export interface LoyaltyAccountView {
  restaurant: { id: string; name: string; slug: string };
  points: number;
  rewards: LoyaltyReward[];
  vouchers: { code: string; name: string; endsAt: string }[];
  [key: string]: unknown;
}
