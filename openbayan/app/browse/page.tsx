"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { 
  IconBook, 
  IconChevronRight, 
  IconFilter,
  IconArrowRight,
  IconX,
  IconInfoCircle,
  IconDatabase,
  IconAlignRight,
  IconFolder,
  IconFileText,
  IconLanguage,
  IconArrowLeft,
  IconLoader,
  IconSearch
} from "@tabler/icons-react"

import { SiteHeader } from "@/components/landing/site-header"
import FooterSection from "@/components/landing/footer"
import { HeroBackground } from "@/components/landing/hero-background"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { queryClientAPI } from "@/lib/graph-client"

// Standard Surah list for responsive local select
const SURAHS = [
  { number: 1, name: "Al-Fatihah", nameAr: "الفاتحة", verses: 7 },
  { number: 2, name: "Al-Baqarah", nameAr: "البقرة", verses: 286 },
  { number: 3, name: "Ali 'Imran", nameAr: "آل عمران", verses: 200 },
  { number: 4, name: "An-Nisa'", nameAr: "النساء", verses: 176 },
  { number: 5, name: "Al-Ma'idah", nameAr: "المائدة", verses: 120 },
  { number: 6, name: "Al-An'am", nameAr: "الأنعام", verses: 165 },
  { number: 7, name: "Al-A'raf", nameAr: "الأعراف", verses: 206 },
  { number: 8, name: "Al-Anfal", nameAr: "الأنفال", verses: 75 },
  { number: 9, name: "At-Tawbah", nameAr: "التوبة", verses: 129 },
  { number: 10, name: "Yunus", nameAr: "يونس", verses: 109 },
  { number: 12, name: "Yusuf", nameAr: "يوسف", verses: 111 },
  { number: 18, name: "Al-Kahf", nameAr: "الكهف", verses: 110 },
  { number: 36, name: "Ya-Sin", nameAr: "يس", verses: 83 },
  { number: 55, name: "Ar-Rahman", nameAr: "الرحمن", verses: 78 },
  { number: 56, name: "Al-Waqi'ah", nameAr: "الواقعة", verses: 96 },
  { number: 67, name: "Al-Mulk", nameAr: "الملك", verses: 30 },
  { number: 100, name: "Al-'Adiyat", nameAr: "العاديات", verses: 11 },
  { number: 112, name: "Al-Ikhlas", nameAr: "الإخلاص", verses: 4 },
  { number: 113, name: "Al-Falaq", nameAr: "الفلق", verses: 5 },
  { number: 114, name: "An-Nas", nameAr: "الناس", verses: 6 }
]

const HADITH_COLLECTIONS = [
  { id: "bukhari", name: "Sahih al-Bukhari", nameAr: "صحيح البخاري", count: 7277 },
  { id: "abudawud", name: "Sunan Abi Dawud", nameAr: "سنن أبي داود", count: 5276 },
  { id: "ahmed", name: "Musnad Ahmad", nameAr: "مسند أحمد", count: 1374 },
  { id: "aladabalmufrad", name: "Al-Adab Al-Mufrad", nameAr: "الأدب المفرد", count: 1326 },
  { id: "bulughalmaram", name: "Bulugh al-Maram", nameAr: "بلوغ المرام", count: 1767 }
]

type TabType = "quran" | "hadith" | "book" | "dictionary" | "topic" | "category" | "sahifah"

export default function BrowsePage() {
  const [activeTab, setActiveTab] = React.useState<TabType>("quran")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Quran state
  const [selectedSurah, setSelectedSurah] = React.useState<number | null>(null)
  const [verses, setVerses] = React.useState<any[]>([])
  const [verseTranslation, setVerseTranslation] = React.useState<"en" | "id_indonesian">("en")

  // Hadith state
  const [selectedCollection, setSelectedCollection] = React.useState<string | null>(null)
  const [hadiths, setHadiths] = React.useState<any[]>([])

  // Book state
  const [books, setBooks] = React.useState<any[]>([])
  const [selectedBook, setSelectedBook] = React.useState<any | null>(null)
  const [bookSentences, setBookSentences] = React.useState<any[]>([])

  // Dictionary state
  const [roots, setRoots] = React.useState<any[]>([])
  const [selectedRoot, setSelectedRoot] = React.useState<any | null>(null)
  const [rootWords, setRootWords] = React.useState<any[]>([])

  // Categories state
  const [categories, setCategories] = React.useState<any[]>([])

  // Sahifah state
  const [sahifahs, setSahifahs] = React.useState<any[]>([])

  // Load Initial Data when switching tabs
  React.useEffect(() => {
    setError(null)
    if (activeTab === "book" && books.length === 0) {
      fetchBooks()
    } else if (activeTab === "dictionary" && roots.length === 0) {
      fetchRoots()
    } else if (activeTab === "category" && categories.length === 0) {
      fetchCategories()
    } else if (activeTab === "sahifah" && sahifahs.length === 0) {
      fetchSahifahs()
    }
  }, [activeTab])

  // Quran: Load Verses when Surah selected
  React.useEffect(() => {
    if (selectedSurah !== null) {
      fetchVerses(selectedSurah)
    }
  }, [selectedSurah])

  // Hadith: Load Hadith when Collection selected
  React.useEffect(() => {
    if (selectedCollection !== null) {
      fetchHadiths(selectedCollection)
    }
  }, [selectedCollection])

  // Dictionary: Load words when Root selected
  React.useEffect(() => {
    if (selectedRoot !== null) {
      fetchWordsForRoot(selectedRoot.id)
    }
  }, [selectedRoot])

  // Book: Load sentences when Book selected
  React.useEffect(() => {
    if (selectedBook !== null) {
      fetchBookSentences(selectedBook.id)
    }
  }, [selectedBook])

  const fetchVerses = async (surahNum: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await queryClientAPI(
        `SELECT surah_number, ayah_number, uthmani_text, translations FROM ayah WHERE surah_number = ${surahNum} ORDER BY ayah_number ASC;`
      )
      setVerses(data || [])
    } catch (e: any) {
      console.error(e)
      setError("Failed to load verses.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHadiths = async (collId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await queryClientAPI(
        `SELECT id, hadith_number, collection, matn_ar, sanad_raw FROM hadith WHERE collection = '${collId}' LIMIT 30;`
      )
      setHadiths(data || [])
    } catch (e: any) {
      console.error(e)
      setError("Failed to load hadiths.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBooks = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await queryClientAPI(
        `SELECT id, title, author, language FROM source WHERE type = 'book' LIMIT 30;`
      )
      setBooks(data || [])
    } catch (e: any) {
      console.error(e)
      setError("Failed to load classical library books.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBookSentences = async (bookId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await queryClientAPI(
        `SELECT id, text, chunk_index FROM sentence WHERE source = '${bookId}' LIMIT 30;`
      )
      setBookSentences(data || [])
    } catch (e: any) {
      console.error(e)
      setError("Failed to load book contents.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRoots = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await queryClientAPI(
        `SELECT id, arabic_root, identifier FROM root WHERE id != root:\`\` LIMIT 80;`
      )
      setRoots(data || [])
    } catch (e: any) {
      console.error(e)
      setError("Failed to load dictionary roots.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWordsForRoot = async (rootRecordId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await queryClientAPI(
        `SELECT id, text, pos, root FROM word WHERE root = ${rootRecordId} LIMIT 50;`
      )
      setRootWords(data || [])
    } catch (e: any) {
      console.error(e)
      setError("Failed to load words.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await queryClientAPI(
        `SELECT id, label, label_ar, level, parent FROM category LIMIT 60;`
      )
      setCategories(data || [])
    } catch (e: any) {
      console.error(e)
      setError("Failed to load categories.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSahifahs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await queryClientAPI(
        `SELECT id, title, content, created_at, author FROM sahifah LIMIT 10;`
      )
      setSahifahs(data || [])
    } catch (e: any) {
      console.error(e)
      setError("Failed to load user sahifah articles.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
        {/* Decorative background grids & gradients */}
        <div aria-hidden="true" className="absolute inset-0 z-0 opacity-40">
          <HeroBackground />
        </div>

        {/* Hero Section */}
        <section className="relative pt-24 pb-10 z-10">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs text-emerald-400 font-semibold border border-emerald-500/20 uppercase tracking-wider mb-4 inline-block">
                Manual Discovery
              </span>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl bg-gradient-to-r from-foreground via-emerald-100 to-emerald-500 bg-clip-text text-transparent">
                Knowledge Browser
              </h1>
              <p className="mx-auto mt-4 text-base leading-7 text-muted-foreground max-w-xl">
                Explore the entire structured database step-by-step. Traverse Quranic verses, prophetic hadiths, classical books, dictionary roots, and researcher articles.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Tab Navigation Section */}
        <section className="relative mx-auto max-w-6xl px-6 pb-20 z-10">
          <div className="flex flex-wrap gap-2 justify-center border-b pb-6 mb-8 border-emerald-500/10">
            {([
              { id: "quran", label: "Quran", icon: IconBook },
              { id: "hadith", label: "Hadith", icon: IconAlignRight },
              { id: "book", label: "Classical Books", icon: IconDatabase },
              { id: "dictionary", label: "Dictionary Roots", icon: IconLanguage },
              { id: "topic", label: "Topics Map", icon: IconFolder },
              { id: "category", label: "Categories", icon: IconFilter },
              { id: "sahifah", label: "Public Sahifah", icon: IconFileText }
            ] as const).map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setSelectedSurah(null)
                    setSelectedCollection(null)
                    setSelectedBook(null)
                    setSelectedRoot(null)
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all border ${
                    isSelected
                      ? "bg-emerald-600 border-emerald-500/30 text-white shadow-md shadow-emerald-950/20"
                      : "bg-slate-950/40 border-emerald-500/5 hover:border-emerald-500/20 hover:text-foreground text-muted-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Loader or Error */}
          {isLoading && (
            <div className="flex flex-col justify-center items-center py-20 text-emerald-500 gap-3">
              <IconLoader className="size-10 animate-spin" />
              <span className="text-sm font-medium animate-pulse">Querying Islamic Knowledge Graph...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center max-w-md mx-auto my-10">
              <IconInfoCircle className="size-10 text-red-500 mx-auto mb-2" />
              <h3 className="font-bold text-lg">Query Failed</h3>
              <p className="text-muted-foreground text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Tab Views */}
          {!isLoading && !error && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* 1. QURAN VIEW */}
                {activeTab === "quran" && (
                  <div>
                    {selectedSurah === null ? (
                      <div>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <IconBook className="text-emerald-500" /> Select a Surah (Chapter)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {SURAHS.map((s) => (
                            <div
                              key={s.number}
                              onClick={() => setSelectedSurah(s.number)}
                              className="group p-5 bg-slate-950/40 hover:bg-slate-900/50 hover:border-emerald-500/30 border border-emerald-500/5 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono font-bold bg-muted px-2 py-1 rounded text-emerald-400">
                                    {s.number}
                                  </span>
                                  <div>
                                    <h4 className="font-bold group-hover:text-emerald-400 transition-colors">{s.name}</h4>
                                    <span className="text-xs text-muted-foreground">{s.verses} Verses</span>
                                  </div>
                                </div>
                                <span className="font-arabic text-lg text-emerald-500/80 group-hover:text-emerald-400 transition-colors">
                                  {s.nameAr}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-emerald-500/10 bg-slate-950/20 hover:bg-slate-900"
                            onClick={() => setSelectedSurah(null)}
                          >
                            <IconArrowLeft className="size-4 mr-1.5" /> Back to Surahs
                          </Button>
                          <div className="flex items-center gap-2 bg-muted/30 border p-1 rounded-xl">
                            <button
                              onClick={() => setVerseTranslation("en")}
                              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                                verseTranslation === "en" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              English
                            </button>
                            <button
                              onClick={() => setVerseTranslation("id_indonesian")}
                              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                                verseTranslation === "id_indonesian" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Indonesian
                            </button>
                          </div>
                        </div>

                        {verses.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground text-sm">
                            No verses found for this Surah.
                          </div>
                        ) : (
                          <div className="space-y-6 max-w-4xl mx-auto">
                            {verses.map((v) => (
                              <Card key={v.id || v.ayah_number} className="bg-slate-950/20 border-emerald-500/5 hover:border-emerald-500/20 transition-all rounded-2xl overflow-hidden shadow-sm">
                                <CardContent className="p-6 space-y-4">
                                  <div className="flex justify-between items-center text-xs text-muted-foreground font-mono">
                                    <span className="bg-muted px-2 py-0.5 rounded text-emerald-400">
                                      Verse {v.surah_number}:{v.ayah_number}
                                    </span>
                                  </div>
                                  <p dir="rtl" className="text-right text-2xl sm:text-3xl leading-loose font-arabic text-foreground/90 py-3">
                                    {v.uthmani_text}
                                  </p>
                                  <p className="text-sm leading-relaxed text-muted-foreground border-t pt-3">
                                    {verseTranslation === "en" 
                                      ? (v.translations?.en || "Translation unavailable.") 
                                      : (v.translations?.id_indonesian || "Terjemahan tidak tersedia.")}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. HADITH VIEW */}
                {activeTab === "hadith" && (
                  <div>
                    {selectedCollection === null ? (
                      <div>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <IconAlignRight className="text-emerald-500" /> Prophetic Hadith Collections
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          {HADITH_COLLECTIONS.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => setSelectedCollection(c.id)}
                              className="group p-6 bg-slate-950/40 hover:bg-slate-900/50 hover:border-emerald-500/30 border border-emerald-500/5 rounded-2xl cursor-pointer transition-all duration-300"
                            >
                              <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                  <span className="font-arabic text-xl text-emerald-500/80 group-hover:text-emerald-400 transition-colors">
                                    {c.nameAr}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                                    {c.count} narrations
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-bold text-lg group-hover:text-emerald-400 transition-colors">{c.name}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">Browse verified canonical narrations</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-emerald-500/10 bg-slate-950/20 hover:bg-slate-900"
                            onClick={() => setSelectedCollection(null)}
                          >
                            <IconArrowLeft className="size-4 mr-1.5" /> Back to Collections
                          </Button>
                          <span className="text-sm font-bold text-emerald-400">
                            {HADITH_COLLECTIONS.find(c => c.id === selectedCollection)?.name}
                          </span>
                        </div>

                        {hadiths.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground text-sm">
                            No narrations found in this collection catalog.
                          </div>
                        ) : (
                          <div className="space-y-6 max-w-4xl mx-auto">
                            {hadiths.map((h) => (
                              <Card key={h.id} className="bg-slate-950/20 border-emerald-500/5 hover:border-emerald-500/20 transition-all rounded-2xl overflow-hidden shadow-sm">
                                <CardContent className="p-6 space-y-4">
                                  <div className="flex justify-between items-center text-xs text-muted-foreground font-mono">
                                    <span className="bg-muted px-2 py-0.5 rounded text-emerald-400">
                                      Hadith No. {h.hadith_number || "N/A"}
                                    </span>
                                    <span className="text-muted-foreground/60">{h.collection}</span>
                                  </div>
                                  
                                  {h.sanad_raw && Array.isArray(h.sanad_raw) && h.sanad_raw.length > 0 && (
                                    <div className="bg-muted/10 p-4 rounded-xl border border-dashed border-emerald-500/10">
                                      <span className="text-[10px] font-bold text-emerald-500/70 block uppercase tracking-wider mb-2">Narrator Chain (Sanad)</span>
                                      <div className="flex flex-wrap gap-1.5 items-center">
                                        {h.sanad_raw.map((narrator: string, idx: number) => (
                                          <React.Fragment key={idx}>
                                            <span className="px-2 py-1 bg-slate-950/40 text-xs font-medium rounded-lg text-foreground/80 border">
                                              {narrator}
                                            </span>
                                            {idx < h.sanad_raw.length - 1 && (
                                              <IconChevronRight className="size-3 text-muted-foreground/40" />
                                            )}
                                          </React.Fragment>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="bg-slate-950/40 p-6 rounded-2xl border">
                                    <p dir="rtl" className="text-right text-xl sm:text-2xl leading-loose font-arabic text-foreground/90">
                                      {h.matn_ar}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. CLASSICAL BOOKS VIEW */}
                {activeTab === "book" && (
                  <div>
                    {selectedBook === null ? (
                      <div>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <IconDatabase className="text-emerald-500" /> Classical Islamic Library Books
                        </h3>
                        {books.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground text-sm">
                            No classical library books found.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {books.map((b) => (
                              <div
                                key={b.id}
                                onClick={() => setSelectedBook(b)}
                                className="group p-6 bg-slate-950/40 hover:bg-slate-900/50 hover:border-emerald-500/30 border border-emerald-500/5 rounded-2xl cursor-pointer transition-all duration-300"
                              >
                                <div className="flex flex-col gap-3 justify-between h-full">
                                  <div>
                                    <h4 className="font-bold text-lg group-hover:text-emerald-400 transition-colors leading-snug">{b.title}</h4>
                                    <span className="text-xs text-muted-foreground block mt-1">Author: {b.author || "Unknown"}</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2 border-t border-emerald-500/5">
                                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">ID: {b.id.split(":")[1]}</span>
                                    <span className="text-xs text-emerald-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      Open Book <IconArrowRight className="size-3.5" />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-emerald-500/10 bg-slate-950/20 hover:bg-slate-900"
                            onClick={() => setSelectedBook(null)}
                          >
                            <IconArrowLeft className="size-4 mr-1.5" /> Back to Books
                          </Button>
                          <div className="text-right">
                            <span className="text-sm font-bold text-emerald-400 block">{selectedBook.title}</span>
                            <span className="text-xs text-muted-foreground">Author: {selectedBook.author}</span>
                          </div>
                        </div>

                        {bookSentences.length === 0 ? (
                          <div className="text-center py-20 text-muted-foreground text-sm border rounded-2xl bg-slate-950/10">
                            Book pages/content is currently being indexed by the flow workers. Check again soon!
                          </div>
                        ) : (
                          <div className="space-y-4 max-w-4xl mx-auto">
                            {bookSentences.map((s) => (
                              <Card key={s.id} className="bg-slate-950/20 border-emerald-500/5 rounded-2xl overflow-hidden">
                                <CardContent className="p-6 flex flex-col sm:flex-row gap-4 justify-between items-start">
                                  <span className="text-xs font-mono bg-muted text-emerald-400 px-2 py-0.5 rounded select-none">
                                    Ch. {s.chunk_index}
                                  </span>
                                  <p dir="rtl" className="flex-1 text-right text-lg sm:text-xl leading-relaxed font-arabic text-foreground">
                                    {s.text}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. DICTIONARY ROOTS VIEW */}
                {activeTab === "dictionary" && (
                  <div>
                    {selectedRoot === null ? (
                      <div>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <IconLanguage className="text-emerald-500" /> Classical Arabic Lexicon Roots
                        </h3>
                        {roots.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground text-sm">
                            No lexical roots found.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {roots.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => setSelectedRoot(r)}
                                className="group px-4 py-3 bg-slate-950/40 hover:bg-slate-900/50 hover:border-emerald-500/30 border border-emerald-500/5 rounded-xl cursor-pointer transition-all font-arabic text-lg text-foreground hover:text-emerald-400 shadow-sm"
                              >
                                {r.arabic_root || r.identifier}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-emerald-500/10 bg-slate-950/20 hover:bg-slate-900"
                            onClick={() => setSelectedRoot(null)}
                          >
                            <IconArrowLeft className="size-4 mr-1.5" /> Back to Roots
                          </Button>
                          <span className="text-sm font-bold text-emerald-400 font-arabic text-xl">
                            Root: {selectedRoot.arabic_root || selectedRoot.identifier}
                          </span>
                        </div>

                        {rootWords.length === 0 ? (
                          <div className="text-center py-20 text-muted-foreground text-sm border rounded-2xl bg-slate-950/10">
                            No derived words or lexicon definitions associated with this root.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {rootWords.map((w) => (
                              <Card key={w.id} className="bg-slate-950/20 border-emerald-500/5 hover:border-emerald-500/20 transition-all rounded-2xl overflow-hidden shadow-sm">
                                <CardContent className="p-5 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded">
                                      {w.pos || "Word form"}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-mono">Word Node</span>
                                  </div>
                                  <p dir="rtl" className="text-right text-2xl font-arabic text-foreground py-2 font-bold">
                                    {w.text}
                                  </p>
                                  <div className="text-xs text-muted-foreground/80 border-t pt-2 mt-2">
                                    Lexicon mapping fully connected in knowledge graph.
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. TOPIC MAP VIEW (Interactive fallback) */}
                {activeTab === "topic" && (
                  <div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <IconFolder className="text-emerald-500" /> Islamic Conceptual Topics Map
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Explore core Islamic topics. These represent unified semantic categories connecting relevant Verses and Hadiths.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                        { title: "Creed (Al-Aqidah)", titleAr: "العقيدة", desc: "Core monotheism (Tawhid), faith concepts, names and attributes of Allah, and resurrection.", counts: "250 links" },
                        { title: "Jurisprudence (Al-Fiqh)", titleAr: "الفقه", desc: "Islamic law, ritual purity, prayer, transactional rulings, and ethical actions.", counts: "432 links" },
                        { title: "Prophetic Ethics (Al-Akhlaq)", titleAr: "الأخلاق", desc: "Moral characters, interpersonal relations, self-rectification, and spiritual excellence.", counts: "185 links" },
                        { title: "Quranic Exegesis (Al-Tafsir)", titleAr: "التفسير", desc: "Classical and modern contextual analysis, revelation backgrounds (Asbab al-Nuzul), and grammar.", counts: "320 links" },
                        { title: "Hadith Sciences (Mustalah)", titleAr: "مصطلح الحديث", desc: "Prophetic tradition verification, narrator biographies, and authenticity grades.", counts: "148 links" }
                      ].map((t, idx) => (
                        <Card key={idx} className="bg-slate-950/40 border-emerald-500/5 hover:border-emerald-500/20 hover:bg-slate-900/40 transition-all rounded-2xl overflow-hidden shadow-sm group">
                          <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="font-arabic text-lg text-emerald-500">{t.titleAr}</span>
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{t.counts}</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-lg group-hover:text-emerald-400 transition-colors">{t.title}</h4>
                              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t.desc}</p>
                            </div>
                            <div className="pt-3 border-t flex justify-end">
                              <Button asChild size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl">
                                <Link href="/search">
                                  Explore in Search <IconArrowRight className="size-3.5 ml-1.5" />
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. CATEGORIES VIEW */}
                {activeTab === "category" && (
                  <div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <IconFilter className="text-emerald-500" /> Hierarchical Classification Tree
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Traverse the academic classification hierarchy of libraries, books, and Islamic sciences.
                    </p>

                    {categories.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        No categories cataloged in the database.
                      </div>
                    ) : (
                      <div className="space-y-3 max-w-4xl">
                        {categories.map((c) => (
                          <div
                            key={c.id}
                            style={{ paddingLeft: `${Math.max((c.level - 1) * 20, 0)}px` }}
                            className="flex items-center gap-3 py-2.5 px-4 bg-slate-950/20 hover:bg-slate-950/50 border border-emerald-500/5 hover:border-emerald-500/20 rounded-xl transition-all"
                          >
                            <span className="text-xs font-bold font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                              Lvl {c.level}
                            </span>
                            <div className="flex-1 flex justify-between items-center flex-wrap gap-2">
                              <div>
                                <span className="font-bold text-sm text-foreground/90">{c.label}</span>
                                {c.parent && (
                                  <span className="text-[10px] text-muted-foreground block">Parent: {c.parent.split(":")[1]}</span>
                                )}
                              </div>
                              {c.label_ar && (
                                <span className="font-arabic text-sm text-emerald-500/80">{c.label_ar}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. PUBLIC SAHIFAH VIEW */}
                {activeTab === "sahifah" && (
                  <div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <IconFileText className="text-emerald-500" /> Public Research Sahifah Articles
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Explore published long-form research papers and articles compiled by OpenBayan researchers.
                    </p>

                    {sahifahs.length === 0 ? (
                      <div className="text-center py-16 border rounded-2xl bg-slate-900/10 max-w-lg mx-auto">
                        <IconFileText className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                        <h4 className="font-bold text-foreground">No Public Sahifah Found</h4>
                        <p className="text-muted-foreground text-sm mt-2 px-6">
                          Researchers have not published any articles publicly yet. You can sign in to the workspace and write your own research draft today!
                        </p>
                        <Button asChild size="sm" className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                          <Link href="/workspace">Create New Sahifah</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6 max-w-3xl mx-auto">
                        {sahifahs.map((s) => (
                          <Card key={s.id} className="bg-slate-950/40 border-emerald-500/5 hover:border-emerald-500/20 transition-all rounded-2xl overflow-hidden shadow-sm">
                            <CardContent className="p-6 space-y-4">
                              <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Author: {s.author || "Independent Researcher"}</span>
                                <span>Published: {new Date(s.created_at).toLocaleDateString()}</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-xl text-emerald-400">{s.title || "Untitled Research"}</h4>
                                <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                                  {s.content || "No content summary provided."}
                                </p>
                              </div>
                              <div className="pt-3 border-t flex justify-end">
                                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                                  <Link href={`/workspace?open=${s.id}`}>
                                    Read Article in Workspace <IconChevronRight className="size-4 ml-1" />
                                  </Link>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </section>
      </main>

      <FooterSection />
    </>
  )
}
