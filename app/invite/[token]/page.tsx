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
    <main className="mx-auto grid min-h-screen max-w-lg content-center px-4 py-10">
      <section className="card p-6">
        <h1 className="text-2xl font-black">Configurer votre acces</h1>
        {invalid ? (
          <div className="mt-4 grid gap-3">
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">Ce lien d&apos;invitation est invalide, expire ou deja utilise.</p>
            <Link href="/login" className="btn w-fit">Aller a la connexion</Link>
          </div>
        ) : (
          <form action={acceptInviteAndSetPassword.bind(null, token)} className="mt-4 grid gap-4">
            <p className="text-sm text-muted">
              Invitation pour <strong>{invite.email}</strong> chez <strong>{invite.firm.name}</strong>.
            </p>
            {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{errors[error] || errors.invalid}</p> : null}
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
