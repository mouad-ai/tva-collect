import Link from "next/link";
import type { Metadata } from "next";
import { requestPasswordReset } from "@/app/actions";

export const metadata: Metadata = {
  title: "Mot de passe oublie",
  description: "Recevez un lien securise pour reinitialiser votre mot de passe TVA Collect."
};

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <section className="card w-full max-w-md p-8 shadow-elevated">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
          <span className="app-shell-brand-mark">TVA</span>
          TVA Collect
        </Link>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Mot de passe oublié</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Indiquez votre email utilisateur. Si un compte actif existe, un lien de réinitialisation sera envoyé.
        </p>

        {sent ? <div className="alert alert-success mt-4">Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.</div> : null}
        {error === "email" ? (
          <div className="alert alert-danger mt-4">Le lien ne peut pas être envoyé pour le moment. Réessayez plus tard ou contactez le support.</div>
        ) : null}

        <form action={requestPasswordReset} className="mt-6 grid gap-4">
          <label>Email<input name="email" type="email" placeholder="vous@cabinet.ma" required /></label>
          <button className="btn btn-primary">Envoyer le lien</button>
        </form>

        <Link href="/login" className="btn btn-ghost mt-4 w-fit">← Retour à la connexion</Link>
      </section>
    </main>
  );
}
