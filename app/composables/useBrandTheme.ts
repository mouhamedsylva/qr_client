import { generatePalette, SHADES } from '~/utils/palette';

const DEFAULT_PRIMARY = 'terracotta';
const DEFAULT_THEME_COLOR = '#CC4A12';

/**
 * Habille l'application aux couleurs du restaurant consulté (RES-02) :
 * palette générée depuis sa couleur de marque, thème clair ou sombre choisi
 * dans le back-office, couleur de la barre du navigateur.
 */
export function useBrandTheme() {
  const appConfig = useAppConfig();
  const colorMode = useColorMode();
  const venue = useVenueStore();

  const brandCss = ref('');
  const themeColor = ref(DEFAULT_THEME_COLOR);
  useHead({
    style: [{ id: 'qro-brand', innerHTML: brandCss }],
    meta: [{ name: 'theme-color', content: themeColor }],
  });

  watch(
    () => venue.restaurant?.brandColors?.primary,
    (hex) => {
      const palette = hex ? generatePalette(hex) : null;
      if (!palette) {
        brandCss.value = '';
        appConfig.ui.colors.primary = DEFAULT_PRIMARY;
        themeColor.value = DEFAULT_THEME_COLOR;
        return;
      }
      brandCss.value = `:root { ${SHADES.map((s) => `--color-brand-${s}: ${palette[s]};`).join(' ')} }`;
      appConfig.ui.colors.primary = 'brand';
      themeColor.value = palette[500];
    },
    { immediate: true },
  );

  watch(
    () => venue.restaurant?.menuTheme,
    (theme) => {
      if (theme) colorMode.preference = theme === 'DARK' ? 'dark' : 'light';
    },
    { immediate: true },
  );
}
