import Link from "next/link";
import { resetPasswordWithToken } from "@/app/actions";
import { PasswordField } from "@/components/PasswordField";
import { hashPasswordResetToken, isPasswordResetUsable } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

const errors: Record<string, string> = {
  mismatch: "Les mots de passe ne correspondent pas.",
  weak: "Mot de passe trop faible : minimum 10 caracteres avec majuscule, minuscule et chiffre.",
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
    <main className="mx-auto grid min-h-screen max-w-lg content-center px-4 py-10">
      <section className="card p-6">
        <h1 className="text-2xl font-black">Reinitialiser le mot de passe</h1>
        {invalid ? (
          <div className="mt-4 grid gap-3">
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              Ce lien est invalide, expire ou deja utilise.
            </p>
            <Link href="/forgot-password" className="btn w-fit">Demander un nouveau lien</Link>
          </div>
        ) : (
          <form action={resetPasswordWithToken.bind(null, token)} className="mt-4 grid gap-4">
            <p className="text-sm text-muted">
              Nouveau mot de passe pour <strong>{reset.user.email}</strong>.
            </p>
            {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{errors[error] || errors.invalid}</p> : null}
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
