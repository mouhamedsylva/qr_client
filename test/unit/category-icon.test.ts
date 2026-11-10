import { describe, expect, it } from 'vitest';
import { categoryIcon, DEFAULT_CATEGORY_ICON } from '~/utils/category-icon';

describe('icône de catégorie', () => {
  it.each([
    ['Entrée', 'i-lucide-salad'],
    ['Entrées froides', 'i-lucide-salad'],
    ['Plats Principaux', 'i-lucide-cooking-pot'],
    ['Desserts', 'i-lucide-cake-slice'],
    ['Boissons', 'i-lucide-cup-soda'],
    ['Accompagnements', 'i-lucide-wheat'],
    ['Soupes', 'i-lucide-soup'],
    ['Grillades', 'i-lucide-flame'],
    ['Poissons & fruits de mer', 'i-lucide-fish'],
    ['Glaces & sorbets', 'i-lucide-ice-cream-cone'],
    ['Boissons chaudes', 'i-lucide-coffee'],
    ['Jus locaux', 'i-lucide-citrus'],
    ['Cocktails sans alcool', 'i-lucide-martini'],
    ['Sodas & eaux', 'i-lucide-cup-soda'],
    ['Beignets & fritures', 'i-lucide-flame-kindling'],
    ['Épices & condiments', 'i-lucide-cooking-pot'],
    ['Thé & infusions', 'i-lucide-coffee'],
    ['Épices', 'i-lucide-utensils'],
    ['Méthode du chef', 'i-lucide-chef-hat'],
  ])('« %s » → %s', (name, icon) => {
    expect(categoryIcon(name)).toBe(icon);
  });

  it('utilise une icône par défaut pour un nom inconnu', () => {
    expect(categoryIcon('Nos trésors')).toBe(DEFAULT_CATEGORY_ICON);
  });
});
