"use client"

import * as React from "react"
import { IconSearch, IconDatabaseSearch, IconBook, IconBookmark, IconHash, IconBinaryTree, IconClock, IconLanguage } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "motion/react"
import type { SearchPayload, SentenceResult } from "@/lib/types/search"
import mockResults from "@/lib/mocks/search-results.json"

export function SearchEditor() {
  const [query, setQuery] = React.useState("Umar Zakat")
  const [isSearching, setIsSearching] = React.useState(false)
  const [payload, setPayload] = React.useState<SearchPayload | null>(mockResults as unknown as SearchPayload)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false)
      // In a real app, this would be an API call
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
              {/* Meta Stats */}
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

              {/* Entity Pills */}
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

              {/* Clustered Results (The Knowledge Tree) */}
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

function SearchResultCard({ result, index }: { result: SentenceResult, index: number }) {
  const arabic = result.content.find(c => c.type === "arabic")?.text
  const translation = result.content.find(c => c.type === "translation")?.text

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group rounded-xl border bg-card shadow-sm transition-all hover:shadow-md overflow-hidden cursor-pointer"
    >
      <div className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 overflow-hidden">
            {result.resource_type === "quran" ? (
              <IconBook className="size-4 text-primary shrink-0" />
            ) : (
              <IconBookmark className="size-4 text-primary shrink-0" />
            )}
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-semibold">{result.citation.source_book}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-muted-foreground truncate">{result.bab || result.citation.chapter}</span>
              {result.subchapter && (
                <>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-muted-foreground truncate">{result.subchapter}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {result.resource_type}
            </span>
            <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600 uppercase tracking-wider">
              {result.citation.authenticity_grade}
            </span>
          </div>
        </div>
        
        <div className="space-y-6">
          {arabic && (
            <div className="relative">
              <p dir="rtl" className="text-3xl leading-relaxed text-right font-arabic text-foreground/90">
                {arabic}
              </p>
            </div>
          )}
          
          {translation && (
            <div className="flex gap-4">
              <div className="mt-1.5 text-muted-foreground/30 shrink-0">
                <IconLanguage className="size-4" />
              </div>
              <p className="text-base text-foreground/80 leading-relaxed italic">
                {translation}
              </p>
            </div>
          )}
        </div>

        {/* Categories / Tags */}
        <div className="mt-6 flex flex-wrap gap-2">
          {result.category_path.map((cat, i) => (
            <span key={i} className="text-[10px] font-medium text-muted-foreground/70 bg-muted/40 px-2 py-1 rounded-md border border-transparent hover:border-muted-foreground/20 transition-all">
              {cat}
            </span>
          ))}
        </div>
      </div>
      
      {/* Footer / Meta */}
      <div className="px-5 py-3 bg-muted/20 border-t flex items-center justify-between text-[10px] text-muted-foreground/70">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            <span>Match: {(result.relevance_score * 100).toFixed(0)}%</span>
          </div>
          {result.mentioned_entities.length > 0 && (
            <div className="flex items-center gap-1">
              <IconHash className="size-2.5" />
              <span>{result.mentioned_entities.map(e => e.canonical_name).join(", ")}</span>
            </div>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 font-medium text-primary">
          Deep Dive ➔
        </div>
      </div>
    </motion.div>
  )
}
