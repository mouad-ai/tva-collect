export default function Loading() {
  return (
    <main className="mx-auto grid min-h-screen max-w-5xl gap-4 px-4 py-8">
      <div className="skeleton h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton h-80" />
    </main>
  );
}
