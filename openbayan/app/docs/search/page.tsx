"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { IconBook, IconDatabase, IconNetwork, IconActivity, IconCode } from "@tabler/icons-react"

import { SiteHeader } from "@/components/landing/site-header"
import FooterSection from "@/components/landing/footer"
import { HeroBackground } from "@/components/landing/hero-background"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function SearchArchitecturePage() {
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
                Search & Retrieval Architecture
              </h1>
              <p className="mx-auto mt-6 text-lg leading-8 text-muted-foreground">
                Providing researchers with highly relevant, cross-corpus results that combine classical exact-match precision with modern semantic understanding.
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
                    <IconActivity className="text-emerald-500" /> Expected Results
                  </h3>
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconBook className="size-4" /> Holistic View
                        </CardTitle>
                        <CardDescription>
                          Results from Quran, Hadith, and scholarly Books in a single, unified interface.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconCode className="size-4" /> Contextual Relevance
                        </CardTitle>
                        <CardDescription>
                          Finding sentences that explain <em>concepts</em>, rather than merely containing keywords.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconNetwork className="size-4" /> Traceability
                        </CardTitle>
                        <CardDescription>
                          Every result is rigidly linked back to its original <code>source</code> and <code>parent</code> node.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-900/50 p-6">
                  <h4 className="font-semibold mb-2">Search Methodology</h4>
                  <ul className="space-y-4 text-sm text-muted-foreground mt-4">
                    <li>
                      <strong className="text-foreground block">1. Lexical Plane (BM25)</strong>
                      Full-Text Search index for exact matches, rare terminology, and specific names, using Arabic normalization.
                    </li>
                    <li>
                      <strong className="text-foreground block">2. Semantic Plane (HNSW)</strong>
                      1024-dim Vector index for synonyms and conceptually related verses, running locally via Ollama.
                    </li>
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
                <h3 className="text-3xl font-semibold">The Search Workflow</h3>
                <p className="text-muted-foreground">OpenBayan utilizes a Hybrid Search strategy implemented securely within SurrealDB.</p>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">1. Normalization & Embedding</h4>
                    <p className="text-sm text-muted-foreground mb-4">The query is cleaned and normalized. Simultaneously, it is sent to Ollama to generate a 1024-dimension vector.</p>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">2. Parallel Retrieval</h4>
                    <p className="text-sm text-muted-foreground mb-4">FTS retrieves top matches based on keyword frequency, while the Vector Query retrieves matches based on cosine similarity.</p>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">3. Reciprocal Rank Fusion (RRF)</h4>
                    <p className="text-sm text-muted-foreground mb-4">Results from both planes are merged. A combined score prioritizes results appearing in both planes.</p>
                  </div>

                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">4. Contextual Enrichment</h4>
                    <p className="text-sm text-muted-foreground mb-4">The system <code>FETCH</code>es metadata and entities for interactive tooltips, returning a sorted, fused result set.</p>
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
                  <IconCode className="text-emerald-500" /> Future Roadmap
                </h3>
                <p className="text-muted-foreground">Planned enhancements to the search infrastructure.</p>
                
                <div className="rounded-xl overflow-hidden border bg-slate-900/50 p-6 space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-500 mt-1">
                      <IconActivity className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Reranking</h4>
                      <p className="text-sm text-muted-foreground">Implementing a secondary Cross-Encoder model to fine-tune the top 10 results.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-500 mt-1">
                      <IconActivity className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Faceted Filtering</h4>
                      <p className="text-sm text-muted-foreground">Allowing users to filter by <code>Taxonomy</code> (e.g., only Fiqh books) or <code>Topic</code>.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-500 mt-1">
                      <IconActivity className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Graph Search</h4>
                      <p className="text-sm text-muted-foreground">Ability to search for entities and find all sentences where they interact with another specific entity.</p>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </>
  )
}
