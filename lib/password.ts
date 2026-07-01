const commonPasswords = new Set([
  "password",
  "password123",
  "123456789",
  "admin123",
  "changeme",
  "demo@tvacollect.ma"
]);

export function validatePasswordStrength(password: string) {
  const errors: string[] = [];
  if (password.length < 12) errors.push("Le mot de passe doit contenir au moins 12 caracteres.");
  if (!/[a-z]/.test(password)) errors.push("Ajoutez une minuscule.");
  if (!/[A-Z]/.test(password)) errors.push("Ajoutez une majuscule.");
  if (!/[0-9]/.test(password)) errors.push("Ajoutez un chiffre.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Ajoutez un caractere special.");
  if (commonPasswords.has(password.toLowerCase())) errors.push("Ce mot de passe est trop courant.");
  return errors;
}

export function assertStrongPassword(password: string) {
  const errors = validatePasswordStrength(password);
  if (errors.length) {
    throw new Error(errors.join(" "));
  }
}
