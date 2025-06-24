import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

const sdkTypeRadios = document.querySelectorAll('input[name="sdkType"]');
const clientSdkRadio = document.getElementById("clientSdk");
const adminSdkRadio = document.getElementById("adminSdk");
const firebaseConfigInput = document.getElementById("firebaseConfigInput");
const callableFunctionNameGroup = document.getElementById(
  "callableFunctionNameGroup"
);
const callableFunctionNameInput = document.getElementById(
  "callableFunctionName"
);
const collectionNameInput = document.getElementById("collectionName");
const fieldNameInput = document.getElementById("fieldName");
const fieldValueInput = document.getElementById("fieldValue");
const fieldValueTypeSelect = document.getElementById("fieldValueType");
const deleteButton = document.getElementById("deleteButton");
const messageDiv = document.getElementById("message");

let db = null;
let functions = null;
let firebaseApp = null;

function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `message-box ${type}`;
  messageDiv.style.display = "block";
  messageDiv.scrollTop = messageDiv.scrollHeight;
}

async function initializeFirebase(configString) {
  try {
    const tempFn = new Function(
      `return ${configString.replace("const firebaseConfig = ", "")};`
    );
    const firebaseConfig = tempFn();

    if (
      typeof firebaseConfig !== "object" ||
      firebaseConfig === null ||
      !firebaseConfig.apiKey ||
      !firebaseConfig.projectId
    ) {
      throw new Error(
        "Configuration Firebase invalide. Assurez-vous d'avoir copié tout l'objet `{ ... }` correctement."
      );
    }

    if (firebaseApp) {
      showMessage(
        "Firebase déjà initialisé. Utilisation de la configuration existante.",
        "info"
      );
    } else {
      firebaseApp = initializeApp(firebaseConfig);
    }

    db = getFirestore(firebaseApp);
    functions = getFunctions(firebaseApp);
    showMessage("Firebase initialisé avec succès.", "info");
    return true;
  } catch (e) {
    showMessage(
      `Erreur d'initialisation de Firebase : ${e.message}. Vérifiez votre configuration.`,
      "error"
    );
    db = null;
    functions = null;
    firebaseApp = null;
    return false;
  }
}

sdkTypeRadios.forEach((radio) => {
  radio.addEventListener("change", (event) => {
    if (event.target.value === "admin") {
      callableFunctionNameGroup.style.display = "block";
      firebaseConfigInput.placeholder =
        'Ex: const firebaseConfig = { apiKey: "YOUR_API_KEY", projectId: "YOUR_PROJECT_ID", ... }; (pour l\'initialisation des fonctions)';
      showMessage(
        "Mode Admin SDK sélectionné. Vous aurez besoin d'une Cloud Function déployée.",
        "info"
      );
    } else {
      callableFunctionNameGroup.style.display = "none";
      firebaseConfigInput.placeholder =
        'Ex: const firebaseConfig = { apiKey: "YOUR_API_KEY", projectId: "YOUR_PROJECT_ID", ... };';
      showMessage(
        "Mode Client SDK sélectionné. Les suppressions se feront directement depuis le navigateur.",
        "info"
      );
    }
  });
});

deleteButton.addEventListener("click", async () => {
  const configString = firebaseConfigInput.value.trim();
  const collectionName = collectionNameInput.value.trim();
  const fieldName = fieldNameInput.value.trim();
  const fieldValueRaw = fieldValueInput.value.trim();
  const fieldValueType = fieldValueTypeSelect.value;
  const selectedSdkType = document.querySelector(
    'input[name="sdkType"]:checked'
  ).value;
  const callableFunctionName = callableFunctionNameInput.value.trim();

  if (!configString || !collectionName || !fieldName || !fieldValueRaw) {
    showMessage("Veuillez remplir tous les champs obligatoires.", "error");
    return;
  }
  if (selectedSdkType === "admin" && !callableFunctionName) {
    showMessage(
      "En mode Admin SDK, le nom de la Cloud Function Callable est requis.",
      "error"
    );
    return;
  }

  const initSuccess = await initializeFirebase(configString);
  if (!initSuccess) {
    return;
  }

  let fieldValueParsed;
  try {
    switch (fieldValueType) {
      case "string":
        fieldValueParsed = fieldValueRaw;
        break;
      case "number":
        fieldValueParsed = parseFloat(fieldValueRaw);
        if (isNaN(fieldValueParsed)) {
          throw new Error("La valeur du champ doit être un nombre valide.");
        }
        break;
      case "boolean":
        const lowerCaseValue = fieldValueRaw.toLowerCase();
        if (lowerCaseValue === "true") {
          fieldValueParsed = true;
        } else if (lowerCaseValue === "false") {
          fieldValueParsed = false;
        } else {
          throw new Error(
            "La valeur du champ booléen doit être 'true' ou 'false'."
          );
        }
        break;
      default:
        fieldValueParsed = fieldValueRaw;
    }
  } catch (e) {
    showMessage(
      `Erreur de conversion de la valeur du champ : ${e.message}`,
      "error"
    );
    return;
  }

  if (
    !confirm(
      `Êtes-vous SÛR de vouloir supprimer TOUS les documents de la collection '${collectionName}' où le champ '${fieldName}' (${fieldValueType}) est égal à '${fieldValueRaw}' ?\n\nCETTE ACTION EST IRRÉVERSIBLE !`
    )
  ) {
    showMessage("Opération annulée par l'utilisateur.", "info");
    return;
  }

  showMessage(
    "Opération de suppression en cours... Veuillez patienter.",
    "info"
  );
  deleteButton.disabled = true;

  try {
    if (selectedSdkType === "client") {
      //LOGIQUE  SDK CLIENT
      if (!db) {
        showMessage(
          "Erreur : Firestore n'est pas initialisé. Vérifiez votre configuration Firebase.",
          "error"
        );
        return;
      }
      const q = query(
        collection(db, collectionName),
        where(fieldName, "==", fieldValueParsed)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showMessage(
          `Aucun document trouvé pour le Client SDK dans la collection '${collectionName}' correspondant au critère : ${fieldName} (${fieldValueType}) == ${fieldValueRaw}.`,
          "success"
        );
        return;
      }

      const batch = writeBatch(db);
      let deletedCount = 0;

      querySnapshot.forEach((document) => {
        batch.delete(doc(db, collectionName, document.id));
        deletedCount++;
      });

      await batch.commit();
      showMessage(
        `CLIENT SDK: ${deletedCount} document(s) supprimé(s) avec succès de la collection '${collectionName}'.`,
        "success"
      );
    } else {
      // SDK ADMIN
      if (!functions) {
        showMessage(
          "Erreur : Firebase Functions n'est pas initialisé. Vérifiez votre configuration Firebase.",
          "error"
        );
        return;
      }
      const deleteCallable = httpsCallable(functions, callableFunctionName);
      const result = await deleteCallable({
        collectionName: collectionName,
        fieldName: fieldName,
        fieldValue: fieldValueParsed,
        fieldValueType: fieldValueType,
      });

      if (result.data && result.data.status === "success") {
        showMessage(
          `ADMIN SDK (Cloud Function): ${result.data.deletedCount} document(s) supprimé(s) avec succès de la collection '${collectionName}'.`,
          "success"
        );
      } else {
        throw new Error(
          result.data.message ||
            "Erreur inconnue lors de l'appel de la Cloud Function."
        );
      }
    }
  } catch (error) {
    console.error("Erreur lors de l'opération de suppression :", error);
    showMessage(
      `Erreur lors de la suppression : ${error.message}. Vérifiez vos règles de sécurité Firebase ou votre Cloud Function.`,
      "error"
    );
  } finally {
    deleteButton.disabled = false;
  }
});
