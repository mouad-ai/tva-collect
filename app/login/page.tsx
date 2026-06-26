import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md p-6">
        <Link href="/" className="text-sm font-bold text-primary">
          TVA Collect
        </Link>
        <h1 className="mt-4 text-2xl font-black">Connexion cabinet</h1>
        <p className="mt-2 text-sm text-muted">Accedez a votre espace de collecte TVA.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
