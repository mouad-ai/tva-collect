import Link from "next/link";
import { acceptInviteAndSetPassword } from "@/app/actions";
import { PasswordField } from "@/components/PasswordField";
import { hashInviteToken } from "@/lib/invites";
import { prisma } from "@/lib/prisma";

const errors: Record<string, string> = {
  mismatch: "Les mots de passe ne correspondent pas.",
  weak: "Mot de passe trop faible : minimum 10 caracteres avec majuscule, minuscule et chiffre.",
  invalid: "Ce lien est invalide, expire ou deja utilise."
};

export default async function InvitePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invite = await prisma.userInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { firm: true }
  });
  const invalid = !invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date();

  return (
    <main className="mx-auto grid min-h-screen max-w-lg content-center bg-surface px-4 py-10">
      <section className="card p-8 shadow-elevated">
        <h1 className="text-2xl font-extrabold tracking-tight">Configurer votre accès</h1>
        {invalid ? (
          <div className="mt-4 grid gap-3">
            <div className="alert alert-danger">Ce lien d&apos;invitation est invalide, expiré ou déjà utilisé.</div>
            <Link href="/login" className="btn btn-primary w-fit">Aller à la connexion</Link>
          </div>
        ) : (
          <form action={acceptInviteAndSetPassword.bind(null, token)} className="mt-4 grid gap-4">
            <p className="text-sm text-muted">
              Invitation pour <strong className="text-ink">{invite.email}</strong> chez <strong className="text-ink">{invite.firm.name}</strong>.
            </p>
            {error ? <div className="alert alert-danger">{errors[error] || errors.invalid}</div> : null}
            {/* UX-FIX: password setup fields include show/hide controls. */}
            <PasswordField name="password" label="Mot de passe" />
            <PasswordField name="confirmPassword" label="Confirmer le mot de passe" />
            <button className="btn btn-primary">Activer mon compte</button>
          </form>
        )}
      </section>
    </main>
  );
}
