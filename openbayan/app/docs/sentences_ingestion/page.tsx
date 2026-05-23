"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { IconBook, IconDatabase, IconNetwork, IconActivity, IconCode } from "@tabler/icons-react"

import { SiteHeader } from "@/components/landing/site-header"
import FooterSection from "@/components/landing/footer"
import { HeroBackground } from "@/components/landing/hero-background"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DocsNav } from "@/components/landing/docs-nav"

export default function SentencesIngestionPage() {
  return (
    <>
      <SiteHeader />
      
      <main className="overflow-hidden">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b pb-16 pt-24 md:pb-24 lg:pt-32">
          <div aria-hidden="true" className="absolute inset-0 z-0">
            <HeroBackground />
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-3xl text-center"
            >
              <div className="mx-auto flex w-fit items-center gap-2 rounded-lg border bg-background p-1 pe-3 mb-8">
                <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-500 font-medium">Documentation</span>
                <span className="text-sm text-muted-foreground">Architecture & Pipelines</span>
              </div>

              <h1 className="text-4xl font-semibold md:text-5xl xl:text-6xl text-foreground">
                Sentence Ingestion
              </h1>
              <p className="mx-auto mt-6 text-lg leading-8 text-muted-foreground">
                The most critical component of the Knowledge Graph. It represents the Atomic Unit of Knowledge—the level at which search, cross-referencing, and semantic analysis occur.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content Section */}
        <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            
            {/* Left Column: Key Characteristics */}
            <div className="lg:col-span-1 space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-semibold flex items-center gap-2 mb-4">
                    <IconActivity className="text-emerald-500" /> Key Characteristics
                  </h3>
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconCode className="size-4" /> Atomicity
                        </CardTitle>
                        <CardDescription>
                          Large texts (Ayahs, Book Pages) are broken down into smaller, semantically coherent "sentences" or "chunks."
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconDatabase className="size-4" /> Hybrid Search Hub
                        </CardTitle>
                        <CardDescription>
                          Hosts both BM25 Full-Text and HNSW Vector indexes (1024-dim), enabling powerful hybrid search.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconNetwork className="size-4" /> Multimodal Linkage
                        </CardTitle>
                        <CardDescription>
                          Every sentence links to its parent, source, words, and entities to form a robust linguistic map.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card className="border-emerald-500/20 bg-emerald-500/5">
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2 text-emerald-500">
                          <IconDatabase className="size-4" /> Data Provenance
                        </CardTitle>
                        <CardDescription className="text-emerald-600/80">
                          Synthesized across upstream planes, currently dominated (~80%) by the <strong>MURAD Reverse Arabic Dictionary</strong>, and segments of <strong>Quranic Verses</strong> and <strong>Classical shamela book pages</strong>.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-900/50 p-6">
                  <h4 className="font-semibold mb-2">Current Status</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex justify-between"><span>Sentence Atoms</span> <strong className="text-foreground">120,907</strong></li>
                    <li className="flex justify-between"><span>Primary Source</span> <strong className="text-foreground">MURAD (80%)</strong></li>
                    <li className="flex justify-between"><span>Search State</span> <strong className="text-foreground">Fully Indexed</strong></li>
                  </ul>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Workflows and Details */}
            <div className="lg:col-span-2 space-y-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h3 className="text-3xl font-semibold">Generation Workflows</h3>
                <p className="text-muted-foreground">Sentences are not ingested directly; they are the output of transformation pipelines processing core texts.</p>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">1. Quranic Atomization</h4>
                    <p className="text-sm text-muted-foreground mb-4">Uses Quranic Waqf (stop) marks to split long Ayahs into natural semantic breathing points. E.g., Ayat al-Kursi is split into 9 sentences.</p>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">2. Dictionary Chunking</h4>
                    <p className="text-sm text-muted-foreground mb-4">Splits book pages into ~350-word blocks. An LLM (Qwen2.5) extracts defining entries as sentences linked back to the page.</p>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors sm:col-span-2">
                    <h4 className="font-semibold text-lg mb-2">3. Enrichment (The Knowledge Plane)</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Each sentence undergoes rigorous enrichment:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><strong>Vectorization</strong>: 1024-dim embeddings via Ollama.</li>
                        <li><strong>Categorization</strong>: Mapped to taxonomies and topics.</li>
                        <li><strong>Entity Extraction</strong>: LLM creates <code>mentions</code> links for people and places.</li>
                        <li><strong>Linguistic Mapping</strong>: Linked to roots and words via <code>composed_of</code>.</li>
                      </ul>
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h3 className="text-3xl font-semibold flex items-center gap-2">
                  <IconCode className="text-emerald-500" /> Data Structure Example
                </h3>
                <p className="text-muted-foreground">A <code>sentence</code> record enriched for hybrid search.</p>
                
                <div className="rounded-xl overflow-hidden border bg-slate-950">
                  <div className="px-4 py-2 bg-slate-900 border-b flex gap-2">
                    <div className="size-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="size-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="size-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                  <pre className="p-6 overflow-x-auto text-sm text-emerald-300">
                    <code>{`{
  "id": "sentence:dict_mura_12345",
  "text": "الصحبة: في اللغة المعاشرة، يقال صحبه يصحبه صحبة",
  "parent": "book_page:passage_abc",
  "source": "source:murad_dataset_2026",
  "embedding": [0.12, -0.05, ...],
  "chunk_index": 0,
  "mention_count": 5
}`}</code>
                  </pre>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        <DocsNav />
      </main>

      <FooterSection />
    </>
  )
}
