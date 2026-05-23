"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { IconBook, IconDatabase, IconNetwork, IconActivity, IconCode } from "@tabler/icons-react"

import { SiteHeader } from "@/components/landing/site-header"
import FooterSection from "@/components/landing/footer"
import { HeroBackground } from "@/components/landing/hero-background"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DocsNav } from "@/components/landing/docs-nav"

export default function BooksIngestionPage() {
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
                Books Ingestion
              </h1>
              <p className="mx-auto mt-6 text-lg leading-8 text-muted-foreground">
                The heavy-lifting component of the OpenBayan Knowledge Graph. It processes massive volumes of classical Islamic texts (Kitabs), dictionaries, and biographical works, converting flat text into structured graph data.
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
                          <IconDatabase className="size-4" /> Granularity
                        </CardTitle>
                        <CardDescription>
                          Data is ingested at the <strong>Page</strong> level (<code>book_page</code>), the raw container for digitized text.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconCode className="size-4" /> Hybrid Extraction
                        </CardTitle>
                        <CardDescription>
                          Uses a combination of Regex and LLM (Qwen2.5) for semantic understanding and entity extraction.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconNetwork className="size-4" /> Graph Transformation
                        </CardTitle>
                        <CardDescription>
                          Transforms page content into atoms (sentences) and linguistic nodes (words), linking to entities and roots.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card className="border-emerald-500/20 bg-emerald-500/5">
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2 text-emerald-500">
                          <IconDatabase className="size-4" /> Data Provenance
                        </CardTitle>
                        <CardDescription className="text-emerald-600/80">
                          Streamed from Hugging Face repository <strong><code>ieasybooks-org/shamela-waqfeya-library</code></strong>, representing thousands of classical Islamic digitized texts (Kitabs).
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-900/50 p-6">
                  <h4 className="font-semibold mb-2">Current Status</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex justify-between"><span>Total Books</span> <strong className="text-foreground">4,661</strong></li>
                    <li className="flex justify-between"><span>Digitized Pages</span> <strong className="text-foreground">83,915</strong></li>
                    <li className="flex justify-between"><span>Dictionary Extr.</span> <strong className="text-foreground">~0.72%</strong></li>
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
                <h3 className="text-3xl font-semibold">Extraction Workflows</h3>
                <p className="text-muted-foreground">The pipeline operates in three distinct phases: Discovery, Ingestion, and Extraction.</p>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">1. Source Discovery</h4>
                    <p className="text-sm text-muted-foreground mb-4">Streams datasets from Hugging Face, filters by category (e.g., "التفاسير"), and saves to local Parquet for processing.</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded text-emerald-400">shamela_hf_ingestion.py</code>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">2. Record Ingestion</h4>
                    <p className="text-sm text-muted-foreground mb-4">Populates the <code>book</code> and <code>book_page</code> tables with raw text and metadata. Sets <code>processed_for_kg = false</code>.</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded text-emerald-400">ingest_shamela_passages.py</code>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors sm:col-span-2">
                    <h4 className="font-semibold text-lg mb-2">3. Knowledge Graph Extraction</h4>
                    <p className="text-sm text-muted-foreground mb-4">The bridge to the Knowledge Plane. Splits pages into semantic chunks, runs LLM analysis to extract roots/words/entities, creates graph edges, and fetches Wikipedia metadata.</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded text-emerald-400">batch_dictionary_extraction.py</code>
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
                <p className="text-muted-foreground">A <code>book_page</code> record acts as the source for extraction.</p>
                
                <div className="rounded-xl overflow-hidden border bg-slate-950">
                  <div className="px-4 py-2 bg-slate-900 border-b flex gap-2">
                    <div className="size-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="size-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="size-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                  <pre className="p-6 overflow-x-auto text-sm text-emerald-300">
                    <code>{`{
  "id": "book_page:passage_123",
  "content": "الصحبة: في اللغة المعاشرة، يقال صحبه يصحبه صحبة...",
  "source": "source:shamela_lisan_al_arab",
  "page_number": 45,
  "processed_for_kg": true
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
