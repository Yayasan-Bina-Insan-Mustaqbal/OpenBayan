"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { 
  IconSearch, 
  IconDatabaseSearch, 
  IconClock, 
  IconBook, 
  IconChevronRight, 
  IconFilter,
  IconArrowRight,
  IconX,
  IconInfoCircle,
  IconHistory
} from "@tabler/icons-react"

import { SiteHeader } from "@/components/landing/site-header"
import FooterSection from "@/components/landing/footer"
import { HeroBackground } from "@/components/landing/hero-background"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { queryClientAPI } from "@/lib/graph-client"

type SearchResult = {
  id: string
  text: string
  source_title?: string
  score: number
  parent?: string
  source?: string
}

export default function SearchPage() {
  const [query, setQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const [results, setResults] = React.useState<SearchResult[] | null>(null)
  const [timeMs, setTimeMs] = React.useState(0)
  const [activeTab, setActiveTab] = React.useState<"all" | "quran" | "hadith" | "books">("all")
  const [selectedResult, setSelectedResult] = React.useState<SearchResult | null>(null)
  const [recentSearches, setRecentSearches] = React.useState<string[]>([])

  React.useEffect(() => {
    // Load recent searches from localStorage if available
    const saved = localStorage.getItem("openbayan_recent_searches")
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const handleSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    setQuery(searchQuery)
    setIsSearching(true)
    const start = performance.now()

    // Add to recent searches
    const updatedRecents = [trimmed, ...recentSearches.filter(q => q !== trimmed)].slice(0, 5)
    setRecentSearches(updatedRecents)
    localStorage.setItem("openbayan_recent_searches", JSON.stringify(updatedRecents))

    try {
      const safeQuery = trimmed.replace(/"/g, '\\"')
      // Query SurrealDB custom function fn::search_sentences via API proxy
      const data = await queryClientAPI<SearchResult>(`RETURN fn::search_sentences("${safeQuery}");`)
      setResults(data || [])
    } catch (err) {
      console.error(err)
      setResults([])
    } finally {
      setTimeMs(Math.round(performance.now() - start))
      setIsSearching(false)
    }
  }


  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  // Helper to categorize results
  const getCategory = (id: string) => {
    if (id.startsWith("ayah:") || id.includes("quran")) return "quran"
    if (id.startsWith("hadith:")) return "hadith"
    return "books" // Default to books/dictionary
  }

  // Filtered results based on tabs
  const filteredResults = React.useMemo(() => {
    if (!results) return []
    if (activeTab === "all") return results
    return results.filter(r => getCategory(r.id) === activeTab)
  }, [results, activeTab])

  // Counts for each tab
  const counts = React.useMemo(() => {
    if (!results) return { all: 0, quran: 0, hadith: 0, books: 0 }
    return results.reduce(
      (acc, r) => {
        const cat = getCategory(r.id)
        acc[cat] += 1
        acc.all += 1
        return acc
      },
      { all: 0, quran: 0, hadith: 0, books: 0 }
    )
  }, [results])

  return (
    <>
      <SiteHeader />
      
      <main className="min-h-screen overflow-hidden bg-background">
        {/* Search Hero Area */}
        <section className="relative overflow-hidden border-b pb-12 pt-20 md:pb-16 lg:pt-28">
          <div aria-hidden="true" className="absolute inset-0 z-0">
            <HeroBackground />
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-3xl text-center"
            >
              <div className="mx-auto flex w-fit items-center gap-2 rounded-lg border bg-background/50 backdrop-blur p-1 pe-3 mb-6">
                <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-500 font-medium">Public Access</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <IconDatabaseSearch className="size-3.5" /> SurrealDB Hybrid Engine
                </span>
              </div>

              <h1 className="text-4xl font-semibold md:text-5xl tracking-tight text-foreground">
                Knowledge Search
              </h1>
              <p className="mx-auto mt-4 text-base leading-7 text-muted-foreground max-w-xl">
                Hybrid keyword and semantic search across the entire Islamic knowledge graph, including Quranic Verses, Hadiths, and Classical Dictionaries.
              </p>

              {/* Main Search Input */}
              <form onSubmit={onSubmit} className="mt-8 relative max-w-2xl mx-auto z-10">
                <div className="relative flex items-center w-full shadow-lg rounded-2xl overflow-hidden border border-emerald-500/20 bg-background/80 backdrop-blur focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all">
                  <div className="pl-4 text-muted-foreground">
                    <IconSearch className="size-5" />
                  </div>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for concepts, words or roots (e.g. قلب, كتاب)..."
                    dir="auto"
                    className="border-0 bg-transparent py-7 text-lg focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-foreground placeholder:text-muted-foreground/60"
                  />
                  <div className="pr-2">
                    <Button 
                      type="submit" 
                      disabled={isSearching || !query.trim()} 
                      size="sm" 
                      className="rounded-xl px-6 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md transition-all"
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </Button>
                  </div>
                </div>
              </form>

              {/* Recent Searches */}
              {recentSearches.length > 0 && !results && !isSearching && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="mt-6 flex flex-wrap justify-center items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                    <IconHistory className="size-3.5" /> Recents:
                  </span>
                  {recentSearches.map((historyQuery) => (
                    <button
                      key={historyQuery}
                      type="button"
                      onClick={() => handleSearch(historyQuery)}
                      className="rounded-full bg-slate-900 border hover:border-emerald-500/40 hover:text-foreground transition-colors px-3 py-1 text-xs"
                    >
                      {historyQuery}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>
        </section>

        {/* Results / Navigation Section */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          {/* Loading State */}
          {isSearching && (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border p-6 bg-slate-950/30 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-1/4 bg-slate-800 rounded" />
                    <div className="h-4 w-12 bg-slate-800 rounded" />
                  </div>
                  <div className="h-6 w-3/4 bg-slate-800 rounded self-end ml-auto" />
                  <div className="h-4 w-1/2 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Search Result Dashboard */}
          {!isSearching && results !== null && (
            <div className="space-y-6">
              {/* Stats & Filters Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <IconClock className="size-4" /> {timeMs}ms
                  </span>
                  <span className="flex items-center gap-1">
                    <IconDatabaseSearch className="size-4" /> {results.length} total hits
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5 bg-muted/50 p-1 rounded-xl border">
                  {(["all", "quran", "hadith", "books"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                        activeTab === tab 
                          ? "bg-emerald-600 text-white shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab} ({counts[tab]})
                    </button>
                  ))}
                </div>
              </div>

              {/* No Results */}
              {filteredResults.length === 0 && (
                <div className="text-center py-16 border rounded-2xl bg-slate-900/10">
                  <IconInfoCircle className="size-12 mx-auto text-muted-foreground/50 mb-3" />
                  <h3 className="font-semibold text-lg">No Results Found</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                    We couldn't find any documents matching your query under the "{activeTab}" filter. Try searching for other terms or relaxing filters.
                  </p>
                </div>
              )}

              {/* Results Cards List */}
              <div className="space-y-4">
                {filteredResults.map((res, i) => (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedResult(res)}
                    className="group border bg-card/40 hover:bg-card/75 hover:border-emerald-500/30 transition-all rounded-2xl p-6 cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                          getCategory(res.id) === "quran" 
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : getCategory(res.id) === "hadith"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {getCategory(res.id)}
                        </span>
                        <span className="text-xs text-muted-foreground/80 font-medium truncate max-w-[200px] sm:max-w-xs">
                          {res.source_title || "Classical Library"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted px-2 py-0.5 rounded">
                        Score: {Number(res.score).toFixed(2)}
                      </span>
                    </div>

                    <p dir="rtl" className="text-xl sm:text-2xl leading-relaxed text-right font-arabic text-foreground/90 pl-6 group-hover:text-emerald-500 transition-colors">
                      {res.text}
                    </p>

                    <div className="mt-4 pt-3 border-t flex justify-end items-center text-xs text-emerald-500 font-medium opacity-0 group-hover:opacity-100 transition-all">
                      <span className="flex items-center gap-1">
                        View Node Context <IconChevronRight className="size-3.5" />
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Landing State - Search Tips */}
          {results === null && !isSearching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 grid md:grid-cols-3 gap-6"
            >
              <Card className="bg-card/40 border-emerald-500/5 hover:border-emerald-500/20 transition-all">
                <CardContent className="pt-6">
                  <div className="bg-emerald-500/10 text-emerald-500 size-10 rounded-xl flex items-center justify-center mb-4">
                    <IconBook className="size-5" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">Lexical Exactness</h4>
                  <p className="text-sm text-muted-foreground">
                    Matches exact Arabic terms and roots using native full-text normalization rules (Harakat stripped, word forms unified).
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/40 border-emerald-500/5 hover:border-emerald-500/20 transition-all">
                <CardContent className="pt-6">
                  <div className="bg-emerald-500/10 text-emerald-500 size-10 rounded-xl flex items-center justify-center mb-4">
                    <IconDatabaseSearch className="size-5" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">Vector Semantic Semantic</h4>
                  <p className="text-sm text-muted-foreground">
                    Translates query conceptual meanings using 1024-dimension vectors to find matching ideas and synonyms.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/40 border-emerald-500/5 hover:border-emerald-500/20 transition-all">
                <CardContent className="pt-6">
                  <div className="bg-emerald-500/10 text-emerald-500 size-10 rounded-xl flex items-center justify-center mb-4">
                    <IconFilter className="size-5" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">Reciprocal Fusion</h4>
                  <p className="text-sm text-muted-foreground">
                    Combines lexical and vector retrieval scores to return a perfectly balanced rank of primary sources.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </section>
      </main>

      {/* Result Details Drawer / Modal Dialog */}
      <AnimatePresence>
        {selectedResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedResult(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground/80 block uppercase tracking-wider">
                    Node: {selectedResult.id}
                  </span>
                  <h3 className="font-bold text-foreground text-lg truncate">
                    {selectedResult.source_title || "Source Detail"}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <IconX className="size-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                <div className="bg-muted/30 border rounded-2xl p-6">
                  <p dir="rtl" className="text-2xl sm:text-3xl leading-relaxed text-right font-arabic text-foreground">
                    {selectedResult.text}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="border rounded-xl p-3 bg-muted/10">
                    <span className="text-xs text-muted-foreground block">Match Relevancy Score</span>
                    <strong className="text-foreground text-base mt-1 block">
                      {Number(selectedResult.score).toFixed(4)}
                    </strong>
                  </div>
                  <div className="border rounded-xl p-3 bg-muted/10">
                    <span className="text-xs text-muted-foreground block">Resource Category</span>
                    <strong className="text-foreground text-base capitalize mt-1 block">
                      {getCategory(selectedResult.id)}
                    </strong>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-foreground">Metadata Context</h4>
                  <ul className="space-y-2 text-xs text-muted-foreground border rounded-xl p-4 bg-muted/10">
                    <li className="flex justify-between">
                      <span>Database ID</span>
                      <code className="text-foreground">{selectedResult.id}</code>
                    </li>
                    {selectedResult.parent && (
                      <li className="flex justify-between">
                        <span>Parent Record</span>
                        <code className="text-foreground">{selectedResult.parent}</code>
                      </li>
                    )}
                    {selectedResult.source && (
                      <li className="flex justify-between">
                        <span>Source Catalog</span>
                        <code className="text-foreground">{selectedResult.source}</code>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t pt-4 mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedResult(null)}>
                  Close
                </Button>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Link href="/workspace">
                    Open in Workspace <IconArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FooterSection />
    </>
  )
}
