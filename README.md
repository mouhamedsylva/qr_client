# QR-Order · Application client (PWA)

Application ouverte par le client en scannant le QR code de sa table. Elle couvre le parcours complet : menu, panier, commande, suivi en temps réel, paiement, reçu et avis.

Nuxt 4 (SPA) · Nuxt UI 4 · Pinia · Socket.IO · Stripe.js. Port de développement : **5173**. C'est l'adresse `CLIENT_APP_URL` de l'API, vers laquelle pointent les QR codes.

## Démarrage

```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:5173
```

L'API (`qr_api`) doit tourner sur le port 3000, avec `http://localhost:5173` dans `CORS_ORIGINS`.

Pour tester sans téléphone, prenez l'URL d'un QR code dans le back-office (Tables & QR). Elle a la forme `http://localhost:5173/t/<jeton>`. Ouvrez-la dans le navigateur en mode « appareil mobile ».

### Tester sur un vrai téléphone (même Wi-Fi)

1. Lancez `npx nuxi dev --port 5173 --host`.
2. Remplacez `localhost` par l'adresse IP du PC (par exemple `192.168.1.20`) :
   - dans `qr_client/.env` : `NUXT_PUBLIC_API_BASE` et `NUXT_PUBLIC_SOCKET_URL` ;
   - dans `qr_api/.env` : `CLIENT_APP_URL` et `CORS_ORIGINS`.
3. Redémarrez l'API, puis régénérez ou réimprimez le QR code.

## Parcours

| Adresse | Écran |
|---|---|
| `/t/<jeton>` | Entrée par QR code : établissement, table et menu en un seul appel |
| `/r/<slug>` | Menu : catégories synchronisées au défilement, recherche, fiche article (options, quantité, précision) |
| `/r/<slug>/panier` | Panier, coordonnées, pourboire, code promo, devis serveur, envoi idempotent |
| `/r/<slug>/infos` | Horaires, adresse, réseaux, programme de fidélité, avis |
| `/commande/<id>` | Suivi en direct, ajout d'articles, annulation, paiement, reçu, avis |
| `/commande/<id>/paiement` | Wave, Orange Money, Free Money, carte (Stripe), addition partagée |
| `/commande/<id>/recu` | Reçu imprimable |
| `/compte` | Compte facultatif : historique, « commander à nouveau », fidélité |
| `/sandbox-pay/<id>` | Simulateur d'opérateur Mobile Money (développement) |

Règles de fonctionnement :

- **Sur place ou à emporter.** Une commande est sur place uniquement depuis le QR d'une table. Le QR comptoir, ou l'adresse `/r/<slug>` ouverte directement, donne une commande à emporter.
- **Accès à une commande.** Commander ne demande pas de compte. Le jeton de suivi est gardé sur l'appareil, et c'est la seule clé d'accès à la commande.
- **Panier.** Le panier est conservé par établissement. Il est revérifié par rapport au menu à jour : un article épuisé est retiré, et le client en est informé.
- **Thème.** L'application prend la couleur de marque et le thème clair ou sombre définis dans le back-office.

## Paiement

- **Mobile Money.** En développement, l'API utilise le simulateur `SANDBOX` (`PAYMENTS_SANDBOX_ENABLED=true`) et redirige vers `/sandbox-pay/<id>`.
- **Carte.** Il faut la clé publique Stripe (`NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) et un restaurant dont l'onboarding Stripe Connect est terminé (back-office → Réglages → Paiements). La confirmation définitive arrive par le webhook Stripe. En local, il faut `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe`.

## Vérifications

```bash
npm run lint
npm run typecheck
npm test
```

## Limites connues

- Le refresh token du compte client est gardé en `localStorage`. Il faudra le passer en cookie httpOnly avant la production, comme pour le back-office.
- Il n'y a pas encore de service worker : l'application est installable (manifest), mais le menu n'est pas consultable hors ligne.
- Les photos sont des URL saisies dans le back-office ; il n'y a pas encore de fournisseur de stockage.
