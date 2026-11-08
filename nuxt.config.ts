// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  // PWA ouverte par QR code : application monopage, servie en statique.
  ssr: false,
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:3000/api/v1',
      socketUrl: 'http://localhost:3000',
      stripePublishableKey: '',
    },
  },

  app: {
    head: {
      title: 'QR-Order',
      htmlAttrs: { lang: 'fr' },
      meta: [
        // viewport-fit=cover : contenu sous l'encoche, marges gérées par env(safe-area-inset-*).
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#CC4A12' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/favicon.svg' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },

  // Pré-chargés pour éviter un rechargement du serveur de dev à la première visite.
  vite: { optimizeDeps: { include: ['zod', 'socket.io-client', '@stripe/stripe-js'] } },

  eslint: { config: { stylistic: false } },
});
