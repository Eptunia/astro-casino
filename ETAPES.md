# AstroCasino : mise en ligne avec Firebase + GitHub, étape par étape

Fais les étapes dans l'ordre. Coche-les au fur et à mesure.

---

## ÉTAPE 1 : Préparer ton dossier

- [ ] Dézipe `astro-firebase-github.zip` **dans le dossier de ton site** (là où il y a `index.html` et `slots.html`).
- [ ] Accepte de remplacer l'ancien `astro2.js`.
- [ ] Vérifie que tu vois bien ces fichiers dans le dossier :
  `astro2.js`, `firebase.json`, `firestore.rules`, `.firebaserc`, `.gitignore`, `.github/workflows/deploy.yml`

> Les fichiers qui commencent par un point sont cachés par défaut.
> Windows : onglet **Affichage > Éléments masqués**.
> Mac : **Cmd + Shift + .**

- [ ] Vérifie que Git est installé : ouvre un terminal et tape `git --version`.

---

## ÉTAPE 2 : Créer le projet Firebase

- [ ] Va sur https://console.firebase.google.com et connecte-toi avec ton compte Google.
- [ ] Clique sur **Ajouter un projet** et donne-lui un nom (ex : `astrocasino`).
- [ ] Google Analytics : tu peux le désactiver.
- [ ] Une fois créé, note l'**ID du projet** (ex : `astrocasino-a1b2c`).
  Tu le retrouves dans **⚙ > Paramètres du projet**.

---

## ÉTAPE 3 : Activer la connexion anonyme

- [ ] Menu de gauche : **Build > Authentication > Commencer**.
- [ ] Onglet **Sign-in method** > **Anonyme** > active > **Enregistrer**.

---

## ÉTAPE 4 : Créer la base de données

- [ ] **Build > Firestore Database > Créer une base de données**.
- [ ] Choisis un emplacement en Europe (ex : `eur3` ou `europe-west`).
- [ ] Choisis le **mode production**, puis termine.
- [ ] Onglet **Règles** : efface tout, colle le contenu du fichier `firestore.rules`, clique sur **Publier**.

---

## ÉTAPE 5 : Activer l'hébergement

- [ ] **Build > Hosting > Commencer**.
- [ ] Clique sur « Suivant » jusqu'au bout (tu n'as rien à installer, GitHub s'en occupera).

---

## ÉTAPE 6 : Récupérer la config et la coller dans le site

- [ ] **⚙ > Paramètres du projet**, section **Tes applications**, clique sur l'icône **`</>`** (Web).
- [ ] Donne un nom à l'app (ex : `astrocasino-web`). Ne coche pas « Firebase Hosting ». Clique sur **Enregistrer**.
- [ ] Firebase affiche un bloc `firebaseConfig = { ... }`. Copie les valeurs.
- [ ] Ouvre `astro2.js`, en haut cherche `firebase: {` et remplis :

```js
firebase: {
  apiKey:            'AIza...',
  authDomain:        'astrocasino-a1b2c.firebaseapp.com',
  projectId:         'astrocasino-a1b2c',
  storageBucket:     'astrocasino-a1b2c.appspot.com',
  messagingSenderId: '123456789',
  appId:             '1:123456789:web:abcdef'
}
```

> Cette clé n'est pas secrète : elle est faite pour être publique. C'est `firestore.rules` qui protège les données.

---

## ÉTAPE 7 : Mettre ton ID de projet dans 2 fichiers

Remplace `REMPLACE-PAR-TON-PROJECT-ID` par ton ID de projet (ex : `astrocasino-a1b2c`) dans :

- [ ] `.firebaserc`
- [ ] `.github/workflows/deploy.yml`

---

## ÉTAPE 8 : Créer le dépôt GitHub

- [ ] Va sur https://github.com/new
- [ ] Nom du dépôt : par exemple `astrocasino`.
- [ ] Ne coche **rien** (pas de README, pas de .gitignore).
- [ ] Clique sur **Create repository**.
- [ ] Copie l'adresse du dépôt, du type `https://github.com/TON-PSEUDO/astrocasino.git`.

---

## ÉTAPE 9 : Donner à GitHub la clé pour publier sur Firebase

- [ ] Console Firebase : **⚙ > Paramètres du projet > Comptes de service**.
- [ ] Clique sur **Générer une nouvelle clé privée** > **Générer la clé**. Un fichier `.json` se télécharge.
- [ ] Ouvre ce fichier avec un éditeur de texte et copie **tout** son contenu.
- [ ] Sur GitHub, dans ton dépôt : **Settings > Secrets and variables > Actions > New repository secret**.
  - Name : `FIREBASE_SERVICE_ACCOUNT`
  - Secret : colle le contenu du fichier
  - Clique sur **Add secret**
- [ ] Supprime le fichier `.json` de ton ordinateur, ou range-le loin du dossier du site. **Ne le mets jamais dans ton dépôt.**

---

## ÉTAPE 10 : Premier envoi (à faire une seule fois)

Ouvre un terminal **dans le dossier du site** et tape, une ligne à la fois
(remplace l'adresse par la tienne) :

```
git init
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/astrocasino.git
git add .
git commit -m "Mise en place Firebase"
git push -u origin main
```

---

## ÉTAPE 11 : Vérifier que ça marche

- [ ] Sur GitHub, ouvre l'onglet **Actions** de ton dépôt. Attends la coche verte (environ 1 minute).
- [ ] Ouvre ton site : `https://TON-ID-DE-PROJET.web.app`
- [ ] Le bandeau doit afficher ton solde, ton code et ton ID.
- [ ] Console Firebase > **Firestore Database** : une collection `players` doit être apparue avec ton compte.

---

## À PARTIR DE MAINTENANT : à chaque modification

Tu modifies ce que tu veux (`index.html`, `slots.html`...), puis dans le terminal :

```
git add .
git commit -m "Description de ce que j'ai changé"
git push
```

Attends environ 1 minute : le site est mis à jour. Si tu ne vois pas le changement, fais **Ctrl + F5** (Cmd + Shift + R sur Mac).

---

## Donner des Coins à un joueur

1. Le joueur te donne son **code à 6 chiffres** (affiché dans son bandeau).
2. Console Firebase > **Firestore Database** > collection `players`.
3. Filtre sur le champ `code`, ou cherche le document à la main.
4. Modifie le champ `solde` (attention : c'est un nombre, pas du texte).
5. Le joueur voit son solde changer en direct.

---

## Si ça ne marche pas

| Problème | Solution |
|---|---|
| L'onglet Actions affiche une croix rouge avec une erreur de permission | Sur https://console.cloud.google.com, sélectionne ton projet > **IAM**, trouve le compte de service (`firebase-adminsdk-...`) et ajoute-lui les rôles **Firebase Hosting Admin** et **API Keys Viewer**. Relance ensuite l'action (bouton **Re-run jobs**). |
| Erreur « secret not found » ou « credentials » | Le secret doit s'appeler exactement `FIREBASE_SERVICE_ACCOUNT`, avec le contenu complet du .json. |
| `git push` demande un mot de passe | GitHub n'accepte plus le mot de passe du compte. Utilise **GitHub Desktop** ou crée un **Personal Access Token** (GitHub > Settings > Developer settings). |
| Le solde ne se synchronise pas | Vérifie que l'authentification **Anonyme** est activée (étape 3) et que les règles sont publiées (étape 4). Ouvre la console du navigateur (F12) : les messages `[Astro]` expliquent le souci. |
| Le site marche mais aucun joueur n'apparaît dans Firestore | La config de l'étape 6 est vide ou fausse : vérifie `apiKey` et `projectId`. |
| Ta branche s'appelle `master` et pas `main` | Le déploiement ne se lance que sur `main`. Refais `git branch -M main` puis `git push -u origin main`. |

---

## Bon à savoir

- Un joueur ne peut pas toucher au compte des autres, mais les mises sont calculées dans son navigateur : un joueur qui sait bidouiller peut modifier son propre solde. Pour des Coins vraiment protégés, il faudrait passer par des Cloud Functions.
- Le code à 6 chiffres peut, très rarement, être identique pour deux joueurs. Vérifie l'`id` avant de créditer.
- Sans config Firebase (étape 6), le site fonctionne en local comme avant.
