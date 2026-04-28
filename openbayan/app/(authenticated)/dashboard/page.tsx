import { Suspense } from "react"

export default async function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      <section className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">Discover OpenBayan</h1>
        {/* Placeholder for SearchInput */}
        <div className="h-10 w-full rounded-md border border-border bg-muted/50 flex items-center px-3 text-muted-foreground">
          Search sources, notes, and references...
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Sahifah</h2>
        <Suspense fallback={<div className="h-32 rounded-lg border border-border bg-muted/20 animate-pulse" />}>
          {/* Placeholder for SahifahGrid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="h-32 rounded-lg border border-border bg-card p-4 flex items-center justify-center text-muted-foreground">Placeholder Card</div>
            <div className="h-32 rounded-lg border border-border bg-card p-4 flex items-center justify-center text-muted-foreground">Placeholder Card</div>
            <div className="h-32 rounded-lg border border-border bg-card p-4 flex items-center justify-center text-muted-foreground">Placeholder Card</div>
          </div>
        </Suspense>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Trending</h2>
        <Suspense fallback={<div className="h-32 rounded-lg border border-border bg-muted/20 animate-pulse" />}>
          {/* Placeholder for SahifahGrid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="h-32 rounded-lg border border-border bg-card p-4 flex items-center justify-center text-muted-foreground">Placeholder Card</div>
            <div className="h-32 rounded-lg border border-border bg-card p-4 flex items-center justify-center text-muted-foreground">Placeholder Card</div>
            <div className="h-32 rounded-lg border border-border bg-card p-4 flex items-center justify-center text-muted-foreground">Placeholder Card</div>
          </div>
        </Suspense>
      </section>
    </div>
  )
}
