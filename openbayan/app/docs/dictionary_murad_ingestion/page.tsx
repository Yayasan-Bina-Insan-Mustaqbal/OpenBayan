"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { IconBook, IconDatabase, IconNetwork, IconActivity, IconCode } from "@tabler/icons-react"

import { SiteHeader } from "@/components/landing/site-header"
import FooterSection from "@/components/landing/footer"
import { HeroBackground } from "@/components/landing/hero-background"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function DictionaryIngestionPage() {
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
                MURAD Dictionary Ingestion
              </h1>
              <p className="mx-auto mt-6 text-lg leading-8 text-muted-foreground">
                Ingestion pipeline for the MURAD dataset, a structured collection of specialized Arabic terminology paired with contextual definitions and cross-references.
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
                          <IconBook className="size-4" /> Lexical Coverage
                        </CardTitle>
                        <CardDescription>
                          Focuses on specialized terminology across academic domains (ML, education, psychology).
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconCode className="size-4" /> Structure
                        </CardTitle>
                        <CardDescription>
                          Primary term (<code>word</code>), descriptive definition (<code>definition</code>), and source taxonomy reference.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconNetwork className="size-4" /> Graph Utility
                        </CardTitle>
                        <CardDescription>
                          Grounds LLM outputs in verified terminology and nuanced semantic explanations.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-900/50 p-6">
                  <h4 className="font-semibold mb-2">Current Status</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex justify-between"><span>Defined Words</span> <strong className="text-foreground">96,221</strong></li>
                    <li className="flex justify-between"><span>Source Graph</span> <strong className="text-foreground truncate ml-4">source:murad_dataset_2026</strong></li>
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
                <h3 className="text-3xl font-semibold">Extraction Workflow</h3>
                <p className="text-muted-foreground">The flow follows a batch-processing pattern using ThreadPoolTaskRunner for concurrency.</p>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">1. Preparation & Batching</h4>
                    <p className="text-sm text-muted-foreground mb-4">Reads <code>data/murad/data/rd_dataset.csv</code> line-by-line and chunks into concurrent batches of 50.</p>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">2. Root & Word</h4>
                    <p className="text-sm text-muted-foreground mb-4">Extracts Arabic roots (with 3-char fallback) and <code>UPSERT</code>s the nodes to SurrealDB.</p>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">3. Definition (Sentence)</h4>
                    <p className="text-sm text-muted-foreground mb-4">Uses MD5 hashing for deduplication. Calls Ollama (mxbai-embed-large) to vectorize the definition text.</p>
                  </div>

                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">4. Graph Relationships</h4>
                    <p className="text-sm text-muted-foreground mb-4">Executes <code>RELATE</code> statements linking the definition sentence to the target word.</p>
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
                <p className="text-muted-foreground">A typical graph record connecting a definition sentence to a word node.</p>
                
                <div className="rounded-xl overflow-hidden border bg-slate-950">
                  <div className="px-4 py-2 bg-slate-900 border-b flex gap-2">
                    <div className="size-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="size-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="size-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                  <pre className="p-6 overflow-x-auto text-sm text-emerald-300">
                    <code>{`{
  "sentence": "امتداد فترة ملازمة الراوي للشيخ، وهو مصطلح يُستخدم في علم الحديث...",
  "word": "طُوْل الصُّحْبَة",
  "root": null
}`}</code>
                  </pre>
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
