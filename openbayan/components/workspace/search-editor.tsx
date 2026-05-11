"use client"

import * as React from "react"
import { IconSearch, IconDatabaseSearch, IconClock } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "motion/react"
import { SearchResultCard } from "./search-result-card"
import { queryGraph } from "@/lib/graph-client"
import { GraphExplorer } from "./graph-explorer"

export function SearchEditor() {
  const [query, setQuery] = React.useState("الكتاب")
  const [isSearching, setIsSearching] = React.useState(false)
  const [results, setResults] = React.useState<any[] | null>(null)
  const [timeMs, setTimeMs] = React.useState(0)
  const [activeGraphId, setActiveGraphId] = React.useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    const start = performance.now()
    try {
      const safeQuery = query.replace(/"/g, '\\"')
      const data = await queryGraph(`RETURN fn::search_sentences("${safeQuery}");`)
      setResults(data)
    } catch (err) {
      console.error(err)
    } finally {
      setTimeMs(Math.round(performance.now() - start))
      setIsSearching(false)
    }
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center justify-center pt-12 pb-8">
          <div className="mb-6 rounded-full bg-primary/10 p-4">
            <IconDatabaseSearch className="size-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Search Knowledge Graph</h2>
          <p className="text-muted-foreground text-center max-w-lg mb-8">
            Full-text semantic search across the entire Islamic graph, powered natively by SurrealDB.
          </p>

          <form onSubmit={handleSearch} className="w-full relative max-w-2xl">
            <div className="relative flex items-center w-full shadow-sm rounded-xl overflow-hidden border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
              <div className="pl-4 text-muted-foreground">
                <IconSearch className="size-5" />
              </div>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for 'الكتاب', 'قلب'..."
                dir="auto"
                className="border-0 bg-transparent py-6 text-lg focus-visible:ring-0 focus-visible:ring-offset-0 px-4"
              />
              <div className="pr-2">
                <Button type="submit" disabled={isSearching || !query.trim()} size="sm" className="rounded-lg px-6 h-10">
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="mt-4 pb-12">
          <AnimatePresence>
            {results && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-4">
                  <div className="flex items-center gap-1.5">
                    <IconClock className="size-4" />
                    <span>{timeMs}ms</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconDatabaseSearch className="size-4" />
                    <span>{results.length} results</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {results.map((result, i) => (
                    <SearchResultCard 
                      key={result.id} 
                      result={result} 
                      index={i} 
                      onClick={() => setActiveGraphId(result.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!results && !isSearching && query && (
            <div className="text-center text-muted-foreground py-12">
              Press search to query the live SurrealDB instance.
            </div>
          )}
        </div>
      </div>
      
      {activeGraphId && (
         <div className="w-1/3 h-full border-l bg-card">
            <GraphExplorer targetId={activeGraphId} />
         </div>
      )}
    </div>
  )
}
