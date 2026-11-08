import { describe, expect, it } from 'vitest';
import type { MenuItem } from '~/types/api';
import {
  cartCount,
  cartSubtotal,
  groupHint,
  lineKey,
  optionLabels,
  selectionErrors,
  toggleOption,
  unitPrice,
} from '~/utils/cart';

const item: MenuItem = {
  id: 'burger',
  categoryId: 'c',
  name: 'Burger',
  description: null,
  priceAmount: 3000,
  images: [],
  prepTimeMinutes: null,
  allergens: [],
  dietaryTags: [],
  calories: null,
  available: true,
  optionGroups: [
    {
      id: 'cuisson',
      name: 'Cuisson',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: 'saignant', name: 'Saignant', priceDelta: 0, isAvailable: true },
        { id: 'apoint', name: 'À point', priceDelta: 0, isAvailable: true },
      ],
    },
    {
      id: 'extras',
      name: 'Suppléments',
      isRequired: false,
      minSelect: 0,
      maxSelect: 2,
      options: [
        { id: 'cheddar', name: 'Cheddar', priceDelta: 500, isAvailable: true },
        { id: 'bacon', name: 'Bacon', priceDelta: 700, isAvailable: true },
        { id: 'oeuf', name: 'Œuf', priceDelta: 300, isAvailable: true },
      ],
    },
  ],
};
const [cuisson, extras] = item.optionGroups as [MenuItem['optionGroups'][0], MenuItem['optionGroups'][0]];

describe('panier', () => {
  it('additionne les suppléments au prix de base', () => {
    expect(unitPrice(item, [])).toBe(3000);
    expect(unitPrice(item, ['apoint', 'cheddar', 'bacon'])).toBe(4200);
  });

  it('exige les groupes obligatoires', () => {
    expect(selectionErrors(item, [])).toEqual({ cuisson: 'Faites un choix' });
    expect(selectionErrors(item, ['saignant'])).toEqual({});
  });

  it('refuse un dépassement du maximum', () => {
    expect(selectionErrors(item, ['saignant', 'cheddar', 'bacon', 'oeuf'])).toEqual({ extras: '2 choix maximum' });
  });

  it('remplace le choix d’un groupe à choix unique', () => {
    expect(toggleOption(cuisson, ['saignant', 'cheddar'], 'apoint')).toEqual(['cheddar', 'apoint']);
  });

  it('ne dépasse pas le maximum en cochant, et décoche au second appui', () => {
    const two = toggleOption(extras, toggleOption(extras, [], 'cheddar'), 'bacon');
    expect(toggleOption(extras, two, 'oeuf')).toEqual(two);
    expect(toggleOption(extras, two, 'cheddar')).toEqual(['bacon']);
  });

  it('regroupe les lignes identiques quel que soit l’ordre des options', () => {
    expect(lineKey('burger', ['b', 'a'], ' sans oignon ')).toBe(lineKey('burger', ['a', 'b'], 'sans oignon'));
    expect(lineKey('burger', ['a'])).not.toBe(lineKey('burger', ['a'], 'sans oignon'));
  });

  it('décrit les options et les consignes des groupes', () => {
    expect(optionLabels(item, ['cheddar', 'saignant'])).toEqual(['Cuisson : Saignant', 'Suppléments : Cheddar']);
    expect(groupHint(cuisson)).toBe('Obligatoire');
    expect(groupHint(extras)).toBe('Facultatif · jusqu\'à 2');
  });

  it('compte les articles et le sous-total', () => {
    const lines = [
      { key: 'a', menuItemId: 'a', name: 'A', image: null, unitPrice: 1000, quantity: 2, optionIds: [], optionLabels: [], notes: '' },
      { key: 'b', menuItemId: 'b', name: 'B', image: null, unitPrice: 2500, quantity: 1, optionIds: [], optionLabels: [], notes: '' },
    ];
    expect(cartCount(lines)).toBe(3);
    expect(cartSubtotal(lines)).toBe(4500);
  });
});
