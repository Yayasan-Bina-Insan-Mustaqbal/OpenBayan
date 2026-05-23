"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { IconBook, IconDatabase, IconNetwork, IconActivity, IconCode } from "@tabler/icons-react"

import { SiteHeader } from "@/components/landing/site-header"
import FooterSection from "@/components/landing/footer"
import { HeroBackground } from "@/components/landing/hero-background"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DocsNav } from "@/components/landing/docs-nav"

export default function HadithIngestionPage() {
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
                Hadith Ingestion
              </h1>
              <p className="mx-auto mt-6 text-lg leading-8 text-muted-foreground">
                Integrates a massive collection of prophetic traditions (Hadith) with their chains of narration (Sanad) and texts (Matn) to build a robust Isnad and Rijal research backbone.
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
                          <IconDatabase className="size-4" /> Source Dataset
                        </CardTitle>
                        <CardDescription>
                          Utilizes the <code>freococo/650k_sanadset</code> dataset from Hugging Face.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconBook className="size-4" /> Data Structure
                        </CardTitle>
                        <CardDescription>
                          Each record contains collection name, Hadith number, text (Matn), and chain (Sanad).
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <IconNetwork className="size-4" /> Research Utility
                        </CardTitle>
                        <CardDescription>
                          Raw Sanad data will be parsed to link narrators into a complex social graph for Rijal.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <Card className="border-emerald-500/20 bg-emerald-500/5">
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2 text-emerald-500">
                          <IconDatabase className="size-4" /> Data Provenance
                        </CardTitle>
                        <CardDescription className="text-emerald-600/80">
                          Primary ingestion leverages the Hugging Face dataset <strong><code>freococo/650k_sanadset</code></strong> alongside complementary Hadith corpuses (including standard compilations from Kutub al-Sittah).
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-900/50 p-6">
                  <h4 className="font-semibold mb-2">Current Status</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex justify-between"><span>Total Ingested</span> <strong className="text-foreground">88,690</strong></li>
                    <li className="flex justify-between"><span>Primary Table</span> <strong className="text-foreground">hadith</strong></li>
                    <li className="flex justify-between"><span>Source Scope</span> <strong className="text-foreground">~650,000</strong></li>
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
                <p className="text-muted-foreground">Orchestrated via Prefect and processed using the Hugging Face <code>datasets</code> library in streaming mode to manage memory efficiency.</p>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">1. Initialization</h4>
                    <p className="text-sm text-muted-foreground mb-4">Ensures the <code>source:hadith_650k_sanadset</code> record exists in the database before proceeding.</p>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">2. Streaming Load</h4>
                    <p className="text-sm text-muted-foreground mb-4">Loads the dataset from Hugging Face with <code>streaming=True</code> to prevent memory overload.</p>
                  </div>
                  
                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">3. Normalization</h4>
                    <p className="text-sm text-muted-foreground mb-4">Slugifies collection names and escapes special characters in Matn/Sanad to prevent SurrealQL errors.</p>
                  </div>

                  <div className="rounded-xl border p-6 bg-card hover:border-emerald-500/30 transition-colors">
                    <h4 className="font-semibold text-lg mb-2">4. Batch Upserting</h4>
                    <p className="text-sm text-muted-foreground mb-4">Groups 100 statements into single transactions for optimized database performance.</p>
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
                <p className="text-muted-foreground">Internal JSON structure before database normalization.</p>
                
                <div className="rounded-xl overflow-hidden border bg-slate-950">
                  <div className="px-4 py-2 bg-slate-900 border-b flex gap-2">
                    <div className="size-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="size-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="size-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                  <pre className="p-6 overflow-x-auto text-sm text-emerald-300">
                    <code>{`{
  "Hadith": "...",
  "Book": "Sahih Bukhari",
  "Num_hadith": "1",
  "Matn": "إنما الأعمال بالنيات...",
  "Sanad": "حدثنا الحميدي عبد الله بن الزبير..."
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
