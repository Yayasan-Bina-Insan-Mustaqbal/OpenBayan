"use client"

import * as React from "react"
import { IconSearch, IconDatabaseSearch, IconBook, IconBookmark } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "motion/react"

export function SearchEditor() {
  const [query, setQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const [results, setResults] = React.useState<any[]>([])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false)
      setResults([
        {
          id: 1,
          type: "ayah",
          title: "Al-Baqarah 2:10",
          content: "فِي قُلُوبِهِم مَّرَضٌ",
          note: "Mentions a disease within hearts",
        },
        {
          id: 2,
          type: "ayah",
          title: "Ash-Shu'ara 26:89",
          content: "إِلَّا مَنْ أَتَى اللَّهَ بِقَلْبٍ سَلِيمٍ",
          note: "Connects qalb with saliim",
        },
        {
          id: 3,
          type: "concept",
          title: "Definition of Qolb",
          content: "Qolb refers to the heart as an inner center of understanding, intention, turning, faith, and spiritual perception.",
        }
      ])
    }, 800)
  }

  return (
    <div className="flex h-full flex-col p-6 max-w-4xl mx-auto w-full">
      <div className="flex flex-col items-center justify-center pt-12 pb-8">
        <div className="mb-6 rounded-full bg-primary/10 p-4">
          <IconDatabaseSearch className="size-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Search Islamic Knowledge</h2>
        <p className="text-muted-foreground text-center max-w-lg mb-8">
          Search across Qur'an, hadith, tafsir, fiqh, and books from ulama using Arabic, English, or transliteration.
        </p>

        <form onSubmit={handleSearch} className="w-full relative">
          <div className="relative flex items-center w-full shadow-sm rounded-xl overflow-hidden border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <div className="pl-4 text-muted-foreground">
              <IconSearch className="size-5" />
            </div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for 'qolb', 'heart', or 'قلب'..."
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

      <div className="flex-1 overflow-auto mt-4">
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-sm font-medium text-muted-foreground mb-4">
                Found {results.length} results for "{query}"
              </div>
              
              {results.map((result, i) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {result.type === "ayah" ? (
                        <IconBook className="size-4 text-primary" />
                      ) : (
                        <IconBookmark className="size-4 text-primary" />
                      )}
                      <h4 className="font-semibold">{result.title}</h4>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground uppercase tracking-wider">
                      {result.type}
                    </span>
                  </div>
                  
                  {result.type === "ayah" ? (
                    <p dir="rtl" className="text-2xl leading-relaxed mt-2 text-right">
                      {result.content}
                    </p>
                  ) : (
                    <p className="text-base text-foreground mt-2">
                      {result.content}
                    </p>
                  )}
                  
                  {result.note && (
                    <p className="mt-3 text-sm text-muted-foreground border-l-2 border-primary/20 pl-3">
                      {result.note}
                    </p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {results.length === 0 && !isSearching && query && (
          <div className="text-center text-muted-foreground py-12">
            Press search to find results for "{query}"
          </div>
        )}
      </div>
    </div>
  )
}
