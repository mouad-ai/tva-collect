import assert from "assert";
import fs from "fs";

const passwordSource = fs.readFileSync(new URL("../lib/password.ts", import.meta.url), "utf8");
const uploadRulesSource = fs.readFileSync(new URL("../lib/upload-rules.ts", import.meta.url), "utf8");
const authSource = fs.readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
const emailSource = fs.readFileSync(new URL("../lib/email/send-email.ts", import.meta.url), "utf8");
const passwordResetSource = fs.readFileSync(new URL("../lib/password-reset.ts", import.meta.url), "utf8");

assert.match(passwordSource, /password\.length < 12/, "password rules must require at least 12 characters");
assert.match(passwordSource, /\[a-z\]/, "password rules must require lowercase letters");
assert.match(passwordSource, /\[A-Z\]/, "password rules must require uppercase letters");
assert.match(passwordSource, /\[0-9\]/, "password rules must require numbers");
assert.match(passwordSource, /commonPasswords/, "password rules must block common defaults");

for (const extension of ["svg", "html", "js", "exe", "bat", "cmd", "php"]) {
  assert.match(uploadRulesSource, new RegExp(`"${extension}"`), `upload rules must block .${extension}`);
}
assert.match(uploadRulesSource, /validateFileMeta/, "upload rules must expose a validation helper");
assert.match(authSource, /canAccessBilling\(role: UserRole\)/, "billing access helper must exist");
assert.match(authSource, /role === UserRole\.OWNER/, "only OWNER should have billing access by default");
assert.match(emailSource, /new Resend\(process\.env\.RESEND_API_KEY\)/, "Resend email provider must use RESEND_API_KEY");
assert.match(emailSource, /EMAIL_PROVIDER.*console/s, "local email provider must support console output");
assert.match(passwordResetSource, /30\) \{/, "password reset tokens must expire after 30 minutes by default");
assert.match(passwordResetSource, /\/reset-password\?token=/, "password reset links must use token query param");

console.log("security source checks passed");
