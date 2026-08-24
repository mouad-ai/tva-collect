/**
 * Escape a value for safe interpolation into an HTML template literal.
 *
 * Anything that reaches a raw `text/html` response and did not originate as a
 * hardcoded literal must go through this — firm names, invoice references and
 * platform billing settings are all operator- or customer-supplied, and the
 * print routes build their markup as template strings rather than JSX (which
 * would escape automatically).
 */
export function escapeHtml(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char
  );
}
