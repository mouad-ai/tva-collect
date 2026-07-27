import bcrypt from "bcryptjs";
import { FirmStatus, OperationalActorType, Prisma, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cookieName, createSessionToken } from "@/lib/auth";
import { ensureFirmSubscription } from "@/lib/billing";
import { supportEmail } from "@/lib/constants";
import { loggedApiError, logServerError } from "@/lib/error-logging";
import { sendSelfServeSignupNotificationEmail, sendTrialWelcomeEmail } from "@/lib/email";
import { passwordStrengthError } from "@/lib/invites";
import { recordOperationalEvent } from "@/lib/operational-events";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitIp } from "@/lib/rate-limit";
import { appBaseUrl, cleanDestinationForRequest, requestHost, sessionCookieDomain } from "@/lib/routing";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
  firmName: z.string().trim().min(1),
  ownerName: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().optional(),
  password: z.string().min(1),
  confirmPassword: z.string().min(1),
  plan: z.string().optional()
});

const selfServePlans = new Set(["STARTER", "PRO"]);

function planFromRequest(value: string | null | undefined) {
  return value && selfServePlans.has(value) ? value : "STARTER";
}

function trialEndDate(now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() + 30);
  return date;
}

const errorMessages: Record<string, string> = {
  missing: "Merci de remplir tous les champs obligatoires.",
  "email-exists": "Un compte existe déjà avec cet email. Connectez-vous plutôt.",
  mismatch: "Les mots de passe ne correspondent pas.",
  weak: "Mot de passe trop faible : minimum 12 caractères avec majuscule, minuscule, chiffre et caractère spécial.",
  "rate-limit": "Trop de tentatives. Réessayez dans quelques minutes."
};

function statusMessage(searchParams: URLSearchParams) {
  const error = searchParams.get("error");
  if (error && errorMessages[error]) {
    return `<p class="alert">${errorMessages[error]}</p>`;
  }
  return "";
}

function signupHtml(request: NextRequest) {
  const message = statusMessage(request.nextUrl.searchParams);
  const plan = planFromRequest(request.nextUrl.searchParams.get("plan"));
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Essai gratuit - TVA Collect</title>
  <meta name="description" content="Démarrez votre essai gratuit de 30 jours sur TVA Collect, sans carte bancaire." />
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="theme-color" content="#0f766e" />
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
    .shell { width: min(100%, 440px); display: grid; gap: 20px; }
    main { border: 1px solid var(--border); border-radius: 14px; background: #fff; padding: 32px; box-shadow: 0 20px 48px -12px rgb(16 24 40 / 12%), 0 2px 6px rgb(16 24 40 / 6%); }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 800; font-size: 16px; letter-spacing: -0.01em; text-decoration: none; }
    .mark { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 9px; background: var(--primary); color: #fff; font-size: 12px; font-weight: 800; box-shadow: 0 2px 6px rgb(15 118 110 / 35%); }
    .trust-badge { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; border-radius: 999px; border: 1px solid #abefc6; background: #ecfdf3; padding: 6px 12px; color: #067647; font-size: 12px; font-weight: 700; }
    h1 { margin: 14px 0 6px; font-size: 24px; font-weight: 800; line-height: 1.2; letter-spacing: -0.02em; color: var(--ink); }
    p { margin: 0; color: var(--muted); line-height: 1.5; }
    form { display: grid; gap: 14px; margin-top: 24px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    label { display: grid; gap: 7px; font-size: 13px; font-weight: 700; color: #344054; }
    input { width: 100%; border: 1px solid var(--border); border-radius: 9px; padding: 11px 13px; font: inherit; color: var(--ink); transition: border-color 120ms ease, box-shadow 120ms ease; }
    input:hover { border-color: #b8c0cf; }
    input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3.5px rgb(15 118 110 / 16%); }
    .hint { font-size: 12px; font-weight: 500; color: var(--muted); }
    button { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; border: 0; border-radius: 9px; padding: 12px 16px; background: var(--primary); color: #fff; font: inherit; font-size: 14.5px; font-weight: 800; letter-spacing: -0.005em; cursor: pointer; box-shadow: 0 1px 2px rgb(15 118 110 / 20%); transition: background-color 120ms ease; }
    button:hover { background: var(--primary-dark); }
    a { color: var(--primary); font-weight: 700; text-decoration: none; }
    a:hover { text-decoration: underline; }
    a:focus-visible, button:focus-visible, input:focus-visible { outline: 2.5px solid var(--primary); outline-offset: 2px; }
    .alert { margin: 0; display: flex; align-items: center; gap: 8px; border: 1px solid #fecdca; border-radius: 9px; background: #fef3f2; padding: 11px 13px; color: #b42318; font-size: 13.5px; font-weight: 700; }
    .trust { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--muted); }
    @media (max-width: 420px) { .row { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="shell">
    <main>
      <a href="/" class="brand"><span class="mark">TVA</span>TVA Collect</a>
      <div class="trust-badge">✓ 30 jours gratuits · sans carte bancaire</div>
      <h1>Créer le compte de votre cabinet</h1>
      <p>Accédez immédiatement à votre espace — aucune attente, aucun appel requis.</p>
      ${message ? `<div style="margin-top:18px">${message}</div>` : ""}
      <form id="signup-form" action="/signup" method="post">
        <input type="hidden" name="plan" value="${plan}" />
        <label>Nom du cabinet<input name="firmName" placeholder="Cabinet Bennani & Associés" required /></label>
        <div class="row">
          <label>Votre nom<input name="ownerName" placeholder="Yasmine Idrissi" required /></label>
          <label>Téléphone<input name="phone" type="tel" placeholder="06 12 34 56 78" /></label>
        </div>
        <label>Email professionnel<input name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="vous@cabinet.ma" required /></label>
        <label>Mot de passe<input name="password" type="password" autocomplete="new-password" required minlength="12" /></label>
        <label>Confirmer le mot de passe<input name="confirmPassword" type="password" autocomplete="new-password" required minlength="12" /></label>
        <span class="hint">Minimum 12 caractères, avec majuscule, minuscule, chiffre et caractère spécial.</span>
        <button type="submit">Démarrer mon essai gratuit</button>
      </form>
    </main>
    <p class="trust">Déjà un compte ? <a href="/login">Se connecter</a></p>
    <p class="trust">Besoin d'aide ? <a href="mailto:${supportEmail}">${supportEmail}</a></p>
  </div>
</body>
</html>`;
}

export function GET(request: NextRequest) {
  return new NextResponse(signupHtml(request), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0"
    }
  });
}

function redirectToSignup(error: keyof typeof errorMessages) {
  return redirectWithRelativeLocation(`/signup?error=${error}`);
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
  const parsed = signupSchema.safeParse({
    firmName: formData.get("firmName"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    plan: formData.get("plan")
  });
  if (!parsed.success) return redirectToSignup("missing");
  const { firmName, ownerName, email, phone, password, confirmPassword } = parsed.data;
  const plan = planFromRequest(parsed.data.plan);

  // Public, unauthenticated form that creates real accounts — without this,
  // it can be spammed to flood the Firm/User tables and trigger unlimited
  // email sends, the same reasoning as the /login and /api/contact limits.
  const ip = rateLimitIp(request);
  const [byIp, byEmail] = await Promise.all([
    rateLimit({ key: `signup:ip:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 }),
    rateLimit({ key: `signup:email:${email}`, limit: 3, windowMs: 60 * 60 * 1000 })
  ]);
  if (!byIp.allowed || !byEmail.allowed) return redirectToSignup("rate-limit");

  if (password !== confirmPassword) return redirectToSignup("mismatch");
  const strengthError = passwordStrengthError(password);
  if (strengthError) return redirectToSignup("weak");

  const existingUser = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existingUser) return redirectToSignup("email-exists");

  const now = new Date();
  const trialEndsAt = trialEndDate(now);

  const { firm, user } = await prisma.$transaction(async (tx) => {
    const createdFirm = await tx.firm.create({
      data: {
        name: firmName,
        phone: phone || null,
        email,
        status: FirmStatus.TRIAL,
        plan,
        trialStartDate: now,
        trialEndDate: trialEndsAt
      }
    });
    const createdUser = await tx.user.create({
      data: {
        name: ownerName,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.OWNER,
        isActive: true,
        firmId: createdFirm.id
      }
    });
    await ensureFirmSubscription(createdFirm.id, createdFirm.plan, {
      trialEndsAt,
      status: FirmStatus.TRIAL,
      tx
    });
    return { firm: createdFirm, user: createdUser };
  });

  await recordOperationalEvent({
    firmId: firm.id,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    eventType: "SELF_SERVE_SIGNUP",
    eventTitle: "Essai gratuit démarré",
    eventDescription: `${user.email} a créé le compte de ${firm.name} en libre-service.`,
    metadata: { plan: firm.plan, trialEndsAt: trialEndsAt.toISOString() },
    source: "PUBLIC_SIGNUP_FORM"
  });

  // Neither email is allowed to block account creation or the redirect —
  // the account and session are already real at this point.
  try {
    await sendTrialWelcomeEmail({ to: email, name: ownerName, firmName: firm.name, appUrl: `${appBaseUrl()}/app`, trialEndDate: trialEndsAt });
  } catch (error) {
    await logServerError({ error, firmId: firm.id, userId: user.id, metadata: { context: "trial-welcome-email" } });
  }
  try {
    await sendSelfServeSignupNotificationEmail({ firmName: firm.name, ownerName, email, phone: phone || null });
  } catch (error) {
    await logServerError({ error, firmId: firm.id, userId: user.id, metadata: { context: "signup-internal-notification" } });
  }

  const response = redirectWithRelativeLocation(cleanDestinationForRequest(request.url, "/app"));
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
    // Two simultaneous signups with the same email both pass the pre-check
    // and race to the database's unique constraint on User.email — the
    // loser should see a friendly redirect, not a raw error page.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return redirectToSignup("email-exists");
    }
    return loggedApiError(error, request);
  }
}
