export default function UnauthorizedPage() {
  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Unauthorized</h1>
      <p className="mt-2">You don’t have permission to view this page.</p>
      <p className="mt-4"><a className="underline" href="/">Go home</a></p>
    </main>
  );
}
