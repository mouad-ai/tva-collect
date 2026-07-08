import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cookieName, createSessionToken } from "@/lib/auth";
import { loggedApiError } from "@/lib/error-logging";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitIp } from "@/lib/rate-limit";
import { cleanDestinationForRequest, requestHost, sessionCookieDomain } from "@/lib/routing";
import { postLoginDestination } from "@/lib/security-policy";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

function statusMessage(searchParams: URLSearchParams) {
  if (searchParams.get("invite") === "accepted") {
    return `<p class="notice">Compte activ&eacute;. Vous pouvez vous connecter.</p>`;
  }
  if (searchParams.get("error") === "credentials") {
    return `<p class="alert">Email ou mot de passe incorrect.</p>`;
  }
  if (searchParams.get("error") === "rate-limit") {
    return `<p class="alert">Trop de tentatives. Reessayez dans quelques minutes.</p>`;
  }
  if (searchParams.get("error") === "account") {
    return `<p class="alert">Compte actif mais incomplet. Contactez l'administrateur TVA Collect.</p>`;
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
  <meta name="description" content="Connectez-vous a TVA Collect pour suivre vos collectes TVA, documents clients et relances." />
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="theme-color" content="#0f766e" />
  <meta property="og:title" content="Connexion - TVA Collect" />
  <meta property="og:description" content="Espace securise TVA Collect pour cabinets comptables." />
  <meta property="og:image" content="/og-image.png" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Connexion - TVA Collect" />
  <meta name="twitter:description" content="Espace securise TVA Collect pour cabinets comptables." />
  <meta name="twitter:image" content="/og-image.png" />
  <style>
    :root { color-scheme: light; --ink: #101828; --muted: #667085; --border: #e4e7ec; --surface: #f6f7f9; --primary: #0f766e; --primary-dark: #0b5751; --danger: #b42318; }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px;
      background: radial-gradient(circle at top, rgba(15, 118, 110, 0.08), transparent 46%), var(--surface);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, ui-sans-serif, system-ui, sans-serif;
      font-size: 14px;
    }
    .shell { width: min(100%, 408px); display: grid; gap: 20px; }
    main { border: 1px solid var(--border); border-radius: 14px; background: #fff; padding: 32px; box-shadow: 0 20px 48px -12px rgb(16 24 40 / 12%), 0 2px 6px rgb(16 24 40 / 6%); }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 800; font-size: 16px; letter-spacing: -0.01em; text-decoration: none; }
    .mark { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 9px; background: var(--primary); color: #fff; font-size: 12px; font-weight: 800; box-shadow: 0 2px 6px rgb(15 118 110 / 35%); }
    h1 { margin: 22px 0 6px; font-size: 24px; font-weight: 800; line-height: 1.2; letter-spacing: -0.02em; color: var(--ink); }
    p { margin: 0; color: var(--muted); line-height: 1.5; }
    form { display: grid; gap: 16px; margin-top: 24px; }
    label { display: grid; gap: 7px; font-size: 13px; font-weight: 700; color: #344054; }
    input { width: 100%; border: 1px solid var(--border); border-radius: 9px; padding: 11px 13px; font: inherit; color: var(--ink); transition: border-color 120ms ease, box-shadow 120ms ease; }
    input:hover { border-color: #b8c0cf; }
    input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3.5px rgb(15 118 110 / 16%); }
    .row-end { display: flex; justify-content: flex-end; margin-top: -4px; }
    button { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; border: 0; border-radius: 9px; padding: 12px 16px; background: var(--primary); color: #fff; font: inherit; font-size: 14.5px; font-weight: 800; letter-spacing: -0.005em; cursor: pointer; box-shadow: 0 1px 2px rgb(15 118 110 / 20%); transition: background-color 120ms ease; }
    button:hover { background: var(--primary-dark); }
    button:disabled { opacity: .65; cursor: wait; }
    a { color: var(--primary); font-weight: 700; text-decoration: none; }
    a:hover { text-decoration: underline; }
    a:focus-visible, button:focus-visible, input:focus-visible { outline: 2.5px solid var(--primary); outline-offset: 2px; }
    .notice { margin: 0; display: flex; align-items: center; gap: 8px; border: 1px solid #abefc6; border-radius: 9px; background: #ecfdf3; padding: 11px 13px; color: #067647; font-size: 13.5px; font-weight: 700; }
    .alert { margin: 0; display: flex; align-items: center; gap: 8px; border: 1px solid #fecdca; border-radius: 9px; background: #fef3f2; padding: 11px 13px; color: #b42318; font-size: 13.5px; font-weight: 700; }
    .trust { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--muted); }
    .trust svg { flex-shrink: 0; }
  </style>
</head>
<body>
  <div class="shell">
    <main>
      <a href="/" class="brand"><span class="mark">TVA</span>TVA Collect</a>
      <h1>Connexion &agrave; votre espace cabinet</h1>
      <p>Acc&eacute;dez &agrave; vos collectes TVA, documents clients et relances.</p>
      ${message ? `<div style="margin-top:18px">${message}</div>` : ""}
      <form id="login-form" action="/login" method="post">
        <label>Email<input name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="vous@cabinet.ma" required /></label>
        <label>Mot de passe<input name="password" type="password" autocomplete="current-password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" required /></label>
        <div class="row-end">
          <a href="/forgot-password">Mot de passe oubli&eacute; ?</a>
        </div>
        <button type="submit">Se connecter</button>
      </form>
    </main>
    <p class="trust">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>
      Connexion s&eacute;curis&eacute;e &mdash; vos donn&eacute;es restent priv&eacute;es
    </p>
  </div>
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

function redirectToLogin(error: "credentials" | "rate-limit" | "account") {
  return redirectWithRelativeLocation(`/login?error=${error}`);
}

function redirectWithRelativeLocation(location: string) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: location
    }
  });
}

async function handlePost(request: NextRequest) {
  const formData = await request.formData();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) return redirectToLogin("credentials");

  const email = parsed.data.email.toLowerCase();
  const ip = rateLimitIp(request);
  const [byIp, byEmail] = await Promise.all([
    rateLimit({ key: `login:ip:${ip}`, limit: 12, windowMs: 15 * 60 * 1000 }),
    rateLimit({ key: `login:email:${email}`, limit: 6, windowMs: 15 * 60 * 1000 })
  ]);
  if (!byIp.allowed || !byEmail.allowed) return redirectToLogin("rate-limit");

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive"
      }
    },
    include: { firm: true }
  });
  if (!user || !user.isActive || !user.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return redirectToLogin("credentials");
  }

  const destination = postLoginDestination(user);
  if (!destination.ok) {
    console.warn("Login blocked for account without valid destination", {
      userId: user.id,
      role: user.role,
      firmId: user.firmId
    });
    return redirectToLogin(destination.error);
  }

  const response = redirectWithRelativeLocation(cleanDestinationForRequest(request.url, destination.redirectTo));
  response.cookies.set(cookieName, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: sessionCookieDomain(requestHost(request)),
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (error) {
    return loggedApiError(error, request);
  }
}
