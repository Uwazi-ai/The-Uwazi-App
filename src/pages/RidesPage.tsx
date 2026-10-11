// Rides to the Polls shell. Sprint 0: no form yet.
export default function RidesPage() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[hsl(var(--rides-bg))] text-[hsl(var(--rides-ink))] px-5 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="font-display text-3xl">Rides to the Polls</h1>
        <div className="rounded-2xl bg-[hsl(var(--rides-blue))] p-4 text-sm">
          Free rides for early voting October 20 to November 2 and Election Day November 3. Booking opens soon.
        </div>
        <button
          type="button"
          disabled
          className="w-full rounded-xl bg-[hsl(var(--rides-green))] py-3 font-semibold text-[hsl(var(--rides-bg))] disabled:opacity-60"
        >
          Request a ride soon
        </button>
      </div>
    </main>
  );
}
