import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { LoginStatusMessages } from "@/components/LoginStatusMessages";

export const dynamic = "force-static";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="card w-full max-w-md p-6">
        <Link href="/" className="app-shell-brand text-base">
          <span className="app-shell-brand-mark">TVA</span>
          TVA Collect
        </Link>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Connexion</h1>
        <p className="mt-2 text-sm text-muted">Accédez à votre espace sécurisé TVA Collect.</p>
        <Suspense fallback={null}>
          <LoginStatusMessages />
        </Suspense>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
