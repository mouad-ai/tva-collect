import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ invite?: string; reset?: string }>;
}) {
  const { invite, reset } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="card w-full max-w-md p-6">
        <Link href="/" className="app-shell-brand text-base">
          <span className="app-shell-brand-mark">TVA</span>
          TVA Collect
        </Link>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Connexion</h1>
        <p className="mt-2 text-sm text-muted">Accédez à votre espace sécurisé TVA Collect.</p>
        {invite === "accepted" ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
            Compte activé. Vous pouvez vous connecter.
          </p>
        ) : null}
        {reset === "done" ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
            Mot de passe réinitialisé. Vous pouvez vous connecter.
          </p>
        ) : null}
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
