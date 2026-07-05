import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function statusMessage(searchParams: URLSearchParams) {
  if (searchParams.get("invite") === "accepted") {
    return `<p class="notice">Compte activ&eacute;. Vous pouvez vous connecter.</p>`;
  }
  const reset = searchParams.get("reset");
  if (reset === "done" || reset === "success") {
    return `<p class="notice">Mot de passe r&eacute;initialis&eacute;. Vous pouvez vous connecter.</p>`;
  }
  return "";
}

function loginHtml(request: NextRequest) {
  const message = statusMessage(request.nextUrl.searchParams);
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connexion - TVA Collect</title>
  <style>
    :root { color-scheme: light; --ink: #172033; --muted: #667085; --border: #d9e1ec; --surface: #f6f8fb; --primary: #1f5eff; --danger: #b42318; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; background: var(--surface); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(100%, 448px); border: 1px solid var(--border); border-radius: 8px; background: #fff; padding: 24px; box-shadow: 0 18px 48px rgb(23 32 51 / 8%); }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 800; text-decoration: none; }
    .mark { display: inline-grid; place-items: center; width: 38px; height: 38px; border-radius: 8px; background: var(--ink); color: #fff; font-size: 13px; letter-spacing: 0; }
    h1 { margin: 24px 0 8px; font-size: 28px; line-height: 1.1; letter-spacing: 0; }
    p { margin: 0; color: var(--muted); }
    form { display: grid; gap: 16px; margin-top: 24px; }
    label { display: grid; gap: 8px; font-size: 14px; font-weight: 700; }
    input { width: 100%; border: 1px solid var(--border); border-radius: 8px; padding: 12px; font: inherit; color: var(--ink); }
    input:focus { outline: 2px solid rgb(31 94 255 / 18%); border-color: var(--primary); }
    button { display: inline-flex; justify-content: center; border: 0; border-radius: 8px; padding: 12px 16px; background: var(--primary); color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
    button:disabled { opacity: .7; cursor: wait; }
    a { color: var(--primary); font-weight: 800; }
    .notice { margin-top: 16px; border: 1px solid #abefc6; border-radius: 8px; background: #ecfdf3; padding: 12px; color: #067647; font-size: 14px; font-weight: 700; }
    .error { min-height: 20px; color: var(--danger); font-size: 14px; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <a href="/" class="brand"><span class="mark">TVA</span>TVA Collect</a>
    <h1>Connexion</h1>
    <p>Acc&eacute;dez &agrave; votre espace s&eacute;curis&eacute; TVA Collect.</p>
    ${message}
    <form id="login-form">
      <label>Email<input name="email" type="email" autocomplete="email" required /></label>
      <label>Mot de passe<input name="password" type="password" autocomplete="current-password" required /></label>
      <a href="/forgot-password">Mot de passe oubli&eacute; ?</a>
      <div class="error" id="login-error" aria-live="polite"></div>
      <button id="login-button" type="submit">Se connecter</button>
    </form>
  </main>
  <script>
    const form = document.getElementById("login-form");
    const error = document.getElementById("login-error");
    const button = document.getElementById("login-button");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
      button.disabled = true;
      const data = new FormData(form);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") })
      }).catch(() => null);
      button.disabled = false;
      if (!response || !response.ok) {
        error.textContent = "Email ou mot de passe incorrect.";
        return;
      }
      const payload = await response.json().catch(() => ({ redirectTo: "/app" }));
      window.location.assign(typeof payload.redirectTo === "string" ? payload.redirectTo : "/app");
    });
  </script>
</body>
</html>`;
}

export function GET(request: NextRequest) {
  return new NextResponse(loginHtml(request), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
