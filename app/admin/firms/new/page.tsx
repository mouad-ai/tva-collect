import { createFirmWithOwnerAction } from "@/app/admin/actions";

export default async function NewFirmPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const params = await searchParams;
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Nouveau cabinet</h1>
        <p className="text-sm text-muted">Creation admin d&apos;un tenant cabinet et de son premier OWNER.</p>
      </div>
      {params.invite ? (
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Lien d&apos;invitation dev</div>
          <code className="mt-2 block break-all rounded bg-slate-100 p-3">{`${process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${params.invite}`}</code>
        </div>
      ) : null}
      <section className="card p-4">
        <form action={createFirmWithOwnerAction} className="grid gap-4">
          <div className="field-grid">
            <label>Nom cabinet<input name="firmName" required /></label>
            <label>Ville<input name="city" /></label>
            <label>Telephone<input name="phone" /></label>
            <label>Email cabinet<input name="email" type="email" /></label>
            <label>Plan<select name="plan" defaultValue="STARTER"><option value="STARTER">Starter</option><option value="PRO">Pro</option><option value="PREMIUM">Premium</option></select></label>
            <label>Debut essai<input name="trialStartsAt" type="date" /></label>
            <label>Fin essai<input name="trialEndsAt" type="date" /></label>
            <label>Owner nom<input name="ownerName" required /></label>
            <label>Owner email<input name="ownerEmail" type="email" required /></label>
          </div>
          <button className="btn btn-primary w-fit">Creer cabinet et invitation OWNER</button>
        </form>
      </section>
    </div>
  );
}
