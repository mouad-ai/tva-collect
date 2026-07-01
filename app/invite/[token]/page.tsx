import { notFound } from "next/navigation";
import { hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InviteForm } from "./InviteForm";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.userInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { firm: true }
  });
  if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt <= new Date()) notFound();

  return (
    <main className="grid min-h-screen place-items-center bg-white px-4">
      <section className="card w-full max-w-md p-6">
        <div className="text-sm font-bold text-primary">TVA Collect</div>
        <h1 className="mt-3 text-2xl font-black">Activer votre compte</h1>
        <p className="mt-2 text-sm text-muted">{invite.name}, vous avez ete invite au cabinet {invite.firm.name}.</p>
        <div className="mt-6"><InviteForm token={token} /></div>
      </section>
    </main>
  );
}
