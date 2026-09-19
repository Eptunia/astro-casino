# AstroCasino — Firebase + GitHub

Après la mise en place (une seule fois), tu publies avec :

```
git add .
git commit -m "Description de ce que j'ai changé"
git push
```

GitHub lance alors automatiquement le déploiement sur Firebase Hosting (~1 min).
Suis l'avancement dans l'onglet **Actions** de ton dépôt.

## Mise en place (une seule fois)

### 1. Créer le projet Firebase
1. https://console.firebase.google.com → **Ajouter un projet** (Analytics pas nécessaire).
2. **Build > Authentication > Commencer > Anonyme** → activer.
3. **Build > Firestore Database > Créer** (mode production, région `eur3` ou `europe-west`).
4. Onglet **Règles** → colle le contenu de `firestore.rules` → **Publier**.
5. **Paramètres du projet (⚙) > Tes applications > </> Web** → enregistre l'app, copie l'objet `firebaseConfig`.
6. Colle ces valeurs dans `CONFIG.firebase` (en haut de `astro2.js`).

### 2. Renseigner ton Project ID
Remplace `REMPLACE-PAR-TON-PROJECT-ID` dans :
- `.firebaserc`
- `.github/workflows/deploy.yml`

### 3. Hosting : clé pour GitHub
1. Console Firebase > ⚙ > **Comptes de service** > **Générer une nouvelle clé privée** (fichier .json).
2. Sur GitHub : dépôt > **Settings > Secrets and variables > Actions > New repository secret**
   - Nom : `FIREBASE_SERVICE_ACCOUNT`
   - Valeur : tout le contenu du fichier .json
3. Ne commit JAMAIS ce fichier .json.

(Alternative automatique : `npm i -g firebase-tools`, `firebase login`, puis `firebase init hosting:github` fait les étapes 3 à sa place.)

### 4. Premier push
```
git init
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/TON-DEPOT.git
git add .
git commit -m "Mise en place Firebase"
git push -u origin main
```

## Donner des Coins à un joueur
Console Firebase > Firestore > collection `players` > filtre sur le champ `code`
(le code à 6 chiffres que le joueur te donne) > modifie `solde`.
Le solde du joueur se met à jour en direct sur son écran.

## Limites à connaître
- Les règles empêchent de toucher au compte des autres, mais un joueur qui sait bidouiller peut
  modifier son propre solde (les mises sont calculées dans le navigateur). Pour de vrais Coins
  protégés, il faudrait passer les mises par des Cloud Functions.
- Le code à 6 chiffres peut théoriquement être identique pour 2 joueurs (1 chance sur 1 000 000
  par paire) : vérifie avec l'`id` avant de créditer.
- Sans config Firebase, le site fonctionne en mode local (localStorage) comme avant.
