import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cookieName, createSessionToken } from "@/lib/auth";
import { loggedApiError } from "@/lib/error-logging";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitIp } from "@/lib/rate-limit";
import { cleanDestinationForRequest } from "@/lib/routing";
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
    .alert { margin-top: 16px; border: 1px solid #fecdca; border-radius: 8px; background: #fef3f2; padding: 12px; color: #b42318; font-size: 14px; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <a href="/" class="brand"><span class="mark">TVA</span>TVA Collect</a>
    <h1>Connexion</h1>
    <p>Acc&eacute;dez &agrave; votre espace s&eacute;curis&eacute; TVA Collect.</p>
    ${message}
    <form id="login-form" action="/login" method="post">
      <label>Email<input name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" required /></label>
      <label>Mot de passe<input name="password" type="password" autocomplete="current-password" required /></label>
      <a href="/forgot-password">Mot de passe oubli&eacute; ?</a>
      <button type="submit">Se connecter</button>
    </form>
  </main>
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
