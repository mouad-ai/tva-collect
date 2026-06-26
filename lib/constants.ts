export const defaultRequiredDocuments = [
  "Factures d'achat",
  "Factures de vente",
  "Releve bancaire",
  "Justificatifs de caisse",
  "Notes de frais",
  "Avoirs",
  "Autres documents TVA"
];

export const monthNames = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre"
];

export const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png", "xls", "xlsx", "doc", "docx"]);

export const maxUploadSize = 10 * 1024 * 1024;
