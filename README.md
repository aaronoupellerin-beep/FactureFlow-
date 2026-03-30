# FactureFlow

MVP simple de creation de devis et factures pour independants.

## Fonctionnalites

- creation de devis
- creation de factures
- lignes de prestation / produit
- calcul automatique sous-total / TVA / total
- sauvegarde locale JSON compatible disque persistant Render
- conversion devis vers facture
- impression PDF via le navigateur
- freemium : 3 documents gratuits
- mini CRM client
- suivi des paiements
- relances pretes a copier
- duplication de document
- abonnement premium PayPal pret a brancher

## Lancement

1. Ouvrir un terminal dans `C:\Users\User\Desktop\Codex\invoice-app`
2. Installer les dependances :

```bash
npm.cmd install
```

3. Optionnel : copier `.env.example` vers `.env` et renseigner PayPal

```bash
copy .env.example .env
```

4. Lancer l'application :

```bash
npm.cmd start
```

5. Ouvrir :

```text
http://127.0.0.1:5050
```

## PayPal

Le MVP est prepare pour un abonnement premium.

Variables d'environnement possibles :

```text
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_PLAN_ID=P-XXXXXXXXXXXX
PAYPAL_ENV=live
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
```

Le bouton utilise l'approche officielle PayPal Subscriptions via le JavaScript SDK avec `components=buttons`, `vault=true` et `intent=subscription`.
Le backend verifie maintenant aussi l'abonnement cote serveur avec l'API PayPal avant d'activer le premium.
Ajoutez `PAYPAL_WEBHOOK_ID` pour synchroniser automatiquement les annulations, suspensions et reactivations via `/api/billing/paypal-webhook`.

Pour de vrais paiements, utilisez vos identifiants `Live` PayPal et un `PLAN_ID` live. Ne melangez jamais :

- `Client ID Sandbox` avec un `Plan Live`
- `Client ID Live` avec un `Plan Sandbox`

Il vous faut un compte `PayPal Business` pour passer en production. PayPal recommande de tester d'abord en sandbox puis de passer en live avec les credentials live : [Test and go live with Subscriptions](https://developer.paypal.com/docs/subscriptions/test-subscriptions/)

Important : comme un secret sandbox a ete partage pendant nos tests, je vous recommande de le regenerer avant toute mise en ligne.

## Monetisation recommandee

- offre gratuite : 3 documents
- premium : 6,99 EUR / mois
- premium inclut : CRM client, relances, duplication, suivi encaissement
- plus tard : offre pro avec branding PDF, multi-utilisateurs et suivi avance

## Deploiement simple

Le projet est pret pour un deploiement simple sur Render avec [render.yaml](C:\Users\User\Desktop\Codex\invoice-app\render.yaml).

Etapes :

1. mettre `invoice-app` sur GitHub
2. creer un service `Blueprint` ou `Web Service` sur Render
3. pointer sur le dossier `invoice-app`
4. verifier que le disque persistant Render est bien cree et monte sur `/opt/render/project/data`
5. renseigner les variables Render :
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_PLAN_ID`
   - `PAYPAL_ENV`
   - `PAYPAL_WEBHOOK_ID`
   - `DATA_DIR=/opt/render/project/data`
6. une fois deployee, l'app sera accessible sur une URL `onrender.com`
7. retourner dans PayPal et remplacer :
   - l'URL du produit par la vraie page publique
   - l'URL du webhook par `https://votre-app.onrender.com/api/billing/paypal-webhook`

Checklist avant ouverture publique :

- regenerer le `PAYPAL_CLIENT_SECRET` si vous estimez qu'il a ete trop expose
- verifier que le plan PayPal est bien `Live`
- verifier que le webhook PayPal pointe vers la vraie URL Render
- faire un abonnement test reel avant de partager le site

Note :

- l'app utilise encore des fichiers JSON plutot qu'une vraie base SQL
- avec le disque persistant Render, cela devient acceptable pour un premier lancement simple
- si le produit grandit, la prochaine evolution logique sera une vraie base de donnees
