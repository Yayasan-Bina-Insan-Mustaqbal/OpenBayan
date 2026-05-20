"use client"

import Link from "next/link"
import { IconArrowRight, IconSearch } from "@tabler/icons-react"
import { motion } from "motion/react"

import { SiteHeader } from "@/components/landing/site-header"
import { Button } from "@/components/ui/button"
import { HeroBackground } from "@/components/landing/hero-background"

import { WorkspaceMockup } from "./hero/hero-visuals"
import { SearchSourceSection } from "./hero/search-section"
import { ConnectionsSection } from "./hero/connections-section"
import { PipelineSection } from "./hero/pipeline-section"
import { SahifahSection } from "./hero/sahifah-section"
import { FutureSection } from "./hero/future-section"

export default function HeroSection() {
  return (
    <>
      <SiteHeader />

      <main className="overflow-hidden">
        <section className="relative overflow-hidden border-b">
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0"
          >
            <HeroBackground />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 pb-12 pt-24 md:pb-16 lg:pt-28">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mx-auto max-w-4xl text-center"
            >
              <Link
                href="#features"
                className="mx-auto flex w-fit items-center gap-2 rounded-lg border bg-background p-1 pe-3"
              >
                <span className="rounded-md bg-muted px-2 py-1 text-xs">OpenBayan vision</span>
                <span className="text-sm text-muted-foreground">Unbiased Islamic knowledge search</span>
                <IconArrowRight className="size-4" />
              </Link>

              <h1 className="mt-8 text-balance text-4xl font-semibold md:text-5xl xl:text-6xl xl:[line-height:1.1]">
                Search Islamic knowledge through sources, not shortcuts.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground">
                OpenBayan is an unbiased semantic search workspace for multi-source Islamic
                knowledge. We expose the source, connections, and summaries so you can connect
                the evidence and summarize it yourself.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row flex-wrap">
                <Button size="lg" asChild>
                  <Link href="/workspace">
                    <IconSearch data-icon="inline-start" />
                    Explore workspace
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#features">View features</Link>
                </Button>
                <Button size="lg" variant="secondary" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" asChild>
                  <Link href="/docs/quran_ingestion">Read the Docs</Link>
                </Button>
              </div>
            </motion.div>

            <WorkspaceMockup />
          </div>
        </section>

        <SearchSourceSection />
        <ConnectionsSection />
        <PipelineSection />
        <SahifahSection />
        <FutureSection />
      </main>
    </>
  )
}
