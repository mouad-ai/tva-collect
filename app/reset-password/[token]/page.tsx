import Link from "next/link";
import { resetPasswordWithToken } from "@/app/actions";
import { PasswordField } from "@/components/PasswordField";
import { hashPasswordResetToken, isPasswordResetUsable } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

const errors: Record<string, string> = {
  mismatch: "Les mots de passe ne correspondent pas.",
  weak: "Mot de passe trop faible : minimum 12 caracteres avec majuscule, minuscule et chiffre.",
  invalid: "Ce lien est invalide, expire ou deja utilise."
};

export default async function ResetPasswordPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(token) },
    include: { user: true }
  });
  const invalid = !reset || !isPasswordResetUsable(reset) || !reset.user.isActive;

  return (
    <main className="mx-auto grid min-h-screen max-w-lg content-center bg-surface px-4 py-10">
      <section className="card p-8 shadow-elevated">
        <h1 className="text-2xl font-extrabold tracking-tight">Réinitialiser le mot de passe</h1>
        {invalid ? (
          <div className="mt-4 grid gap-3">
            <div className="alert alert-danger">Ce lien est invalide, expiré ou déjà utilisé.</div>
            <Link href="/forgot-password" className="btn btn-primary w-fit">Demander un nouveau lien</Link>
          </div>
        ) : (
          <form action={resetPasswordWithToken.bind(null, token)} className="mt-4 grid gap-4">
            <p className="text-sm text-muted">
              Nouveau mot de passe pour <strong className="text-ink">{reset.user.email}</strong>.
            </p>
            {error ? <div className="alert alert-danger">{errors[error] || errors.invalid}</div> : null}
            {/* UX-FIX: reset password fields include show/hide controls. */}
            <PasswordField name="password" label="Mot de passe" />
            <PasswordField name="confirmPassword" label="Confirmer le mot de passe" />
            <button className="btn btn-primary">Enregistrer le mot de passe</button>
          </form>
        )}
      </section>
    </main>
  );
}
