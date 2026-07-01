import Link from "next/link";
import { requestPasswordReset } from "@/app/actions";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="card w-full max-w-md p-6">
        <Link href="/" className="text-sm font-bold text-primary">TVA Collect</Link>
        <h1 className="mt-4 text-2xl font-black">Mot de passe oublie</h1>
        <p className="mt-2 text-sm text-muted">
          Indiquez votre email utilisateur. Si un compte actif existe, un lien de reinitialisation sera envoye.
        </p>

        {sent ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            Si ce compte existe, un lien de reinitialisation a été envoye.
          </div>
        ) : null}
        {error === "email" ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            Le lien ne peut pas etre envoye pour le moment. Reessayez plus tard ou contactez le support.
          </div>
        ) : null}

        <form action={requestPasswordReset} className="mt-6 grid gap-4">
          <label>Email<input name="email" type="email" required /></label>
          <button className="btn btn-primary">Envoyer le lien</button>
        </form>

        <Link href="/login" className="btn mt-4 w-fit">Retour connexion</Link>
      </section>
    </main>
  );
}
