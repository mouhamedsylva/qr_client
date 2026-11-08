/**
 * Charge l'établissement de l'adresse /r/<slug> (lien direct ou rechargement) ;
 * sans effet s'il est déjà en mémoire (arrivée par le QR code).
 */
export function useVenueLoader() {
  const route = useRoute();
  const venue = useVenueStore();
  const slug = computed(() => String(route.params.slug));
  const { status, error, refresh } = useAsyncData(
    () => `venue-${slug.value}`,
    async () => {
      await venue.load(slug.value);
      return true;
    },
    { watch: [slug] },
  );
  return { slug, status, error, refresh };
}
