export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Search Results</h1>
        <p className="text-muted-foreground">Showing results for: {q || "..."}</p>
      </div>
      
      <div className="grid gap-4">
        {/* Placeholder for Results */}
        <div className="h-24 rounded-lg border border-dashed border-border bg-card/50 backdrop-blur p-4 flex items-center text-muted-foreground shadow-sm transition-all hover:bg-card/80">Result Placeholder</div>
        <div className="h-24 rounded-lg border border-dashed border-border bg-card/50 backdrop-blur p-4 flex items-center text-muted-foreground shadow-sm transition-all hover:bg-card/80">Result Placeholder</div>
      </div>
    </div>
  )
}
