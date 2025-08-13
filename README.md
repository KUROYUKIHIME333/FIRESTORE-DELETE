# Firestore Delete (FBP PURGE)

Outil web pour supprimer rapidement des documents d'une collection Firestore selon un critère, à utiliser uniquement en développement local.
[Firebase | Supprimeur de Docs](https://firestore-delete.onrender.com/) est également accessible en ligne, et attend vos retours et commentaires.

## Fonctionnalités
- Suppression en masse de documents Firestore selon un champ et une valeur donnée.
- Deux modes :
  - **Client SDK** : suppression directe depuis le navigateur (pour tests/développement).
  - **Admin SDK** : suppression via une Cloud Function Firebase Callable (plus sécurisé, recommandé pour de gros volumes ou des droits élevés).
- Interface moderne, simple et sécurisée.
- Prise en charge des types de champ : string, number, boolean.
- Messages d'alerte et de confirmation pour éviter les suppressions accidentelles.

## Sécurité
⚠️ **NE JAMAIS UTILISER EN PRODUCTION**
- Cet outil est destiné uniquement au développement local.
- Les suppressions sont IRRÉVERSIBLES.
- L'utilisation du mode Admin SDK nécessite une Cloud Function déployée côté serveur.

## Utilisation
1. **Cloner le projet** et ouvrir `index.html` dans un navigateur moderne.
2. **Choisir le mode** (Client SDK ou Admin SDK).
3. **Renseigner la configuration Firebase** (copier/coller l'objet de config du projet).
4. **(Admin SDK)** : indiquer le nom de la Cloud Function Callable.
5. **Renseigner la collection, le champ, la valeur et le type**.
6. **Cliquer sur "Démarrer la Purge"** et confirmer l'opération.

## Dépendances
- [Firebase JS SDK](https://firebase.google.com/docs/web/setup)
- (Optionnel) Cloud Function personnalisée pour le mode Admin SDK.

## Exemple de Cloud Function (Admin SDK)
```js
// index.js (Cloud Functions)
exports.deleteDocumentsByQuery = functions.https.onCall(async (data, context) => {
  const { collectionName, fieldName, fieldValue, fieldValueType } = data;
  // ... logique de suppression côté serveur ...
  return { status: 'success', deletedCount };
});
```

## Auteurs
- Réalisé par [Daniel Ramazani](https://daniel-ramazani.onrender.com/) (2025)

## Licence
MIT
