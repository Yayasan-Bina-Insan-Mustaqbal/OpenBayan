"use client"

import * as React from "react"
import { IconSearch, IconDatabaseSearch, IconHash, IconBinaryTree, IconClock } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "motion/react"
import type { SearchPayload } from "@/lib/types/search"
import mockResults from "@/lib/mocks/search-results.json"
import { SearchResultCard } from "./search-result-card"

export function SearchEditor() {
  const [query, setQuery] = React.useState("Umar Zakat")
  const [isSearching, setIsSearching] = React.useState(false)
  const [payload, setPayload] = React.useState<SearchPayload | null>(mockResults as unknown as SearchPayload)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setTimeout(() => {
      setIsSearching(false)
      setPayload(mockResults as unknown as SearchPayload)
    }, 800)
  }

  const results = payload?.data.structuredContent

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col items-center justify-center pt-12 pb-8">
        <div className="mb-6 rounded-full bg-primary/10 p-4">
          <IconDatabaseSearch className="size-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Search Islamic Knowledge</h2>
        <p className="text-muted-foreground text-center max-w-lg mb-8">
          Search across Qur'an, hadith, tafsir, fiqh, and books from ulama using Arabic, English, or transliteration.
        </p>

        <form onSubmit={handleSearch} className="w-full relative max-w-2xl">
          <div className="relative flex items-center w-full shadow-sm rounded-xl overflow-hidden border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
            <div className="pl-4 text-muted-foreground">
              <IconSearch className="size-5" />
            </div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for 'Umar Zakat', 'heart', or 'قلب'..."
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
                  <span>{results.processing_time_ms}ms</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <IconBinaryTree className="size-4" />
                  <span>{results.category_clusters.total_categories_found} categories</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <IconDatabaseSearch className="size-4" />
                  <span>{results.sentence_results.total_found} results</span>
                </div>
              </div>

              {(results.entity_results.items.length > 0 || results.root_word_results.items.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {results.entity_results.items.map((entity) => (
                    <div 
                      key={entity.entity_id}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                    >
                      <IconHash className="size-3" />
                      {entity.canonical_name}
                      <span className="text-[10px] opacity-60 ml-1">{entity.entity_type}</span>
                    </div>
                  ))}
                  {results.root_word_results.items.map((root) => (
                    <div 
                      key={root.root_id}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-600 cursor-pointer hover:bg-amber-500/20 transition-colors"
                    >
                      <span className="font-arabic text-sm">{root.root_value_ar}</span>
                      <span className="text-[10px] opacity-60 ml-1">Root</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-6">
                {results.sentence_results.items.map((result, i) => (
                  <SearchResultCard key={result.id} result={result} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {!results && !isSearching && query && (
          <div className="text-center text-muted-foreground py-12">
            Press search to find results for "{query}"
          </div>
        )}
      </div>
    </div>
  )
}
