import fs from "node:fs";
import path from "node:path";

const roots = ["app", "components", "lib"];
const extensions = new Set([".tsx", ".ts"]);

const replacements = [
  ["Deconnexion", "Déconnexion"],
  ["Parametres", "Paramètres"],
  ["Preparation TVA", "Préparation TVA"],
  ["Declaration TVA", "Déclaration TVA"],
  ["Tresorerie TVA", "Trésorerie TVA"],
  ["Defense fiscale", "Défense fiscale"],
  ["Evenements", "Événements"],
  ["Proprietaire", "Propriétaire"],
  ["proprietaire", "propriétaire"],
  ["Demarrage", "Démarrage"],
  ["Societe", "Société"],
  ["Telephone", "Téléphone"],
  ["Accedez", "Accédez"],
  ["reinitialise", "réinitialisé"],
  ["reinitialiser", "réinitialiser"],
  ["Confidentialite", "Confidentialité"],
  ["Creer ", "Créer "],
  ["Creez ", "Créez "],
  [" creer ", " créer "],
  [" creer.", " créer."],
  [" creer,", " créer,"],
  ["Generer ", "Générer "],
  [" generer ", " générer "],
  ["generees", "générées"],
  ["generes", "générés"],
  ["genere", "généré"],
  ["Completer ", "Compléter "],
  [" completer ", " compléter "],
  ["Verifier ", "Vérifier "],
  [" verifier ", " vérifier "],
  ["periode", "période"],
  ["Periode", "Période"],
  ["Periodes", "Périodes"],
  ["echeance", "échéance"],
  ["Echeance", "Échéance"],
  ["depot", "dépôt"],
  ["Depot", "Dépôt"],
  ["depots", "dépôts"],
  ["Depots", "Dépôts"],
  ["depose", "dépose"],
  ["deposes", "déposés"],
  ["controle", "contrôle"],
  ["Controle", "Contrôle"],
  ["detection", "détection"],
  ["detecter", "détecter"],
  ["apercu", "aperçu"],
  ["eleve", "élevé"],
  ["recu", "reçu"],
  ["recus", "reçus"],
  ["economise", "économise"],
  ["economisee", "économisée"],
  ["Cloturer", "Clôturer"],
  ["cloturee", "clôturée"],
  ["cloture", "clôture"],
  ["operationnel", "opérationnel"],
  ["equipe", "équipe"],
  ["securise", "sécurisé"],
  ["securisee", "sécurisée"],
  ["securisees", "sécurisées"],
  ["Annule", "Annulé"],
  ["Fermee", "Fermée"],
  ["demarrage", "démarrage"],
  ["creee", "créée"],
  [" cree ", " créé "],
  [" cree.", " créé."],
  [" cree,", " créé,"],
  [" ete ", " été "],
  [" ete.", " été."],
  ["marques invalides", "marqués invalides"],
  ["A relancer", "À relancer"],
  ["A verifier", "À vérifier"],
  ["A risque", "À risque"],
  ["A surveiller", "À surveiller"],
  ["Pret", "Prêt"],
  ["prets", "prêts"],
  ["Terminee", "Terminée"],
  ["terminee", "terminée"],
  ["Selectionner", "Sélectionner"],
  ["Telecharger", "Télécharger"],
  ["Verifiez", "Vérifiez"],
  ["Eleve", "Élevé"],
  ["Recu", "Reçu"],
  ["Genere", "Généré"],
  ["Generees", "Générées"],
  ["Generes", "Générés"]
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, files);
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

let changedFiles = 0;
for (const root of roots) {
  const rootPath = path.join(process.cwd(), root);
  if (!fs.existsSync(rootPath)) continue;
  for (const file of walk(rootPath)) {
    let content = fs.readFileSync(file, "utf8");
    let next = content;
    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }
    if (next !== content) {
      fs.writeFileSync(file, next);
      changedFiles += 1;
      console.log("updated", path.relative(process.cwd(), file));
    }
  }
}

console.log(`Done. ${changedFiles} file(s) updated.`);
