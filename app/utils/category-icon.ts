/**
 * Icône d'une catégorie du menu, déduite de son nom (le restaurateur n'a rien
 * à configurer). Les règles sont testées dans l'ordre : la première qui
 * correspond l'emporte. Les noms d'icônes sont écrits en entier pour que
 * Nuxt Icon les inclue au build.
 */
const RULES: [RegExp, string][] = [
  [/petit.?dej|breakfast|brunch|viennois/, 'i-lucide-croissant'],
  [/entree|starter|hors.?d.?oeuvre|amuse|tapas|mezze|aperitif/, 'i-lucide-salad'],
  [/salade/, 'i-lucide-salad'],
  [/soupe|potage|veloute|bouillon/, 'i-lucide-soup'],
  [/beignet|friture|frit|pastel|fataya|accra/, 'i-lucide-flame-kindling'],
  [/grillade|grill|braise|brochette|barbecue|bbq|dibi/, 'i-lucide-flame'],
  [/poisson|fruit.?de.?mer|crustace|seafood|crevette/, 'i-lucide-fish'],
  [/poulet|volaille|chicken/, 'i-lucide-drumstick'],
  [/viande|boeuf|agneau|mouton|steak/, 'i-lucide-beef'],
  [/burger/, 'i-lucide-hamburger'],
  [/pizza/, 'i-lucide-pizza'],
  [/sandwich|panini|wrap|chawarma|shawarma/, 'i-lucide-sandwich'],
  [/riz|cereale|feculent|couscous|fonio|attieke/, 'i-lucide-wheat'],
  [/legume|vegetari|vegan/, 'i-lucide-carrot'],
  [/sauce|condiment/, 'i-lucide-cooking-pot'],
  [/accompagnement|garniture|side/, 'i-lucide-wheat'],
  [/enfant|kid|junior/, 'i-lucide-baby'],
  [/glace|sorbet|\bice\b/, 'i-lucide-ice-cream-cone'],
  [/patisserie|gateau|tarte|viennoiserie/, 'i-lucide-cake-slice'],
  [/dessert|douceur|sucre/, 'i-lucide-cake-slice'],
  [/\bcafe|\bthes?\b|chaude|infusion|\bhot\b/, 'i-lucide-coffee'],
  [/jus|smoothie|milkshake|frais/, 'i-lucide-citrus'],
  [/cocktail|mocktail/, 'i-lucide-martini'],
  [/eau|soda|soft/, 'i-lucide-cup-soda'],
  [/boisson|drink|rafraichissement/, 'i-lucide-cup-soda'],
  [/plat|principa|resistance|main|specialite|menu/, 'i-lucide-cooking-pot'],
  [/promo|offre|formule/, 'i-lucide-percent'],
  [/nouveau|signature|chef/, 'i-lucide-chef-hat'],
];

export const DEFAULT_CATEGORY_ICON = 'i-lucide-utensils';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .toLowerCase()
    .trim();
}

export function categoryIcon(name: string): string {
  const n = normalize(name);
  return RULES.find(([re]) => re.test(n))?.[1] ?? DEFAULT_CATEGORY_ICON;
}
