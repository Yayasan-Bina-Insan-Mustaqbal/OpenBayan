"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { IconBook, IconDatabase, IconNetwork, IconActivity, IconCode } from "@tabler/icons-react"

import { SiteHeader } from "@/components/landing/site-header"
import FooterSection from "@/components/landing/footer"
import { HeroBackground } from "@/components/landing/hero-background"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DocsNav } from "@/components/landing/docs-nav"

export default function QuranIngestionPage() {
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
                Quran Ingestion
              </h1>
              <p className="mx-auto mt-6 text-lg leading-8 text-muted-foreground">
                A multi-modal data acquisition system that builds a rich, interconnected knowledge base for each Ayah. Combining primary text, translations, classical Tafsirs, and thematic annotations.
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
                          <IconDatabase className="size-4" /> Layered Architecture
                        </CardTitle>
                        <CardDescription>
                          The <code>ayah</code> table acts as the central hub where subsequent flows append data.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconBook className="size-4" /> Multi-Source
                        </CardTitle>
                        <CardDescription>
                          Integrates AlQuran Cloud, Quran.com, and custom scholarly datasets.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconNetwork className="size-4" /> Graph Connections
                        </CardTitle>
                        <CardDescription>
                          Creates <code>classified_as</code> edges linking Ayahs to thematic nodes.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card className="border-emerald-500/20 bg-emerald-500/5">
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2 text-emerald-500">
                          <IconDatabase className="size-4" /> Data Provenance
                        </CardTitle>
                        <CardDescription className="text-emerald-600/80">
                          Acquired from <strong>AlQuran Cloud API</strong> (text & translations), <strong>Quran.com API</strong> (Arabic Tafsirs), and <strong>Ronnieaban's Quranic Dataset</strong> (Sabab Nuzul, thematic metadata).
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-900/50 p-6">
                  <h4 className="font-semibold mb-2">Current Status</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex justify-between"><span>Ayahs Processed</span> <strong className="text-foreground">6,236 (100%)</strong></li>
                    <li className="flex justify-between"><span>Thematic Categories</span> <strong className="text-foreground">1,314</strong></li>
                    <li className="flex justify-between"><span>Classification Links</span> <strong className="text-foreground">7,660</strong></li>
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
                <p className="text-muted-foreground">The ingestion is composed of specialized Prefect flows, each responsible for a specific layer.</p>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">1. Multi-Edition</h4>
                    <p className="text-sm text-muted-foreground mb-4">Ingests text-based editions (Translations, Tafsirs) from AlQuran Cloud.</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded text-emerald-400">ingest_quran_editions.py</code>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">2. Scholarly Metadata</h4>
                    <p className="text-sm text-muted-foreground mb-4">Adds Indonesian metadata (Wajiz, Sabab Nuzul, Intro, Themes).</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded text-emerald-400">ingest_quran_ronnieaban_metadata.py</code>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">3. Arabic Tafsir</h4>
                    <p className="text-sm text-muted-foreground mb-4">Targets high-quality Arabic Tafsirs from Quran.com API.</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded text-emerald-400">ingest_quran_tafsir_qurancom.py</code>
                  </div>

                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">4. Thematic Analysis</h4>
                    <p className="text-sm text-muted-foreground mb-4">Ingests annotations for emotion, sentiment, and subgrouping.</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded text-emerald-400">ingest_quran_thematic_emotional.py</code>
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
                <p className="text-muted-foreground">An <code>ayah</code> record serves as a JSON hub containing multiple nested layers.</p>
                
                <div className="rounded-xl overflow-hidden border bg-slate-950">
                  <div className="px-4 py-2 bg-slate-900 border-b flex gap-2">
                    <div className="size-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="size-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="size-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                  <pre className="p-6 overflow-x-auto text-sm text-emerald-300">
                    <code>{`{
  "surah_number": 1,
  "ayah_number": 1,
  "text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "translations": {
    "en_sahih": "In the name of Allah...",
    "id_indonesian": "Dengan menyebut nama..."
  },
  "tafsir": {
    "ar_saddi": "...",
    "id_wajiz": "..."
  },
  "metadata": {
    "emotion": "mercy",
    "sentiment": "positive",
    "theme_group": "Basmalah"
  }
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
