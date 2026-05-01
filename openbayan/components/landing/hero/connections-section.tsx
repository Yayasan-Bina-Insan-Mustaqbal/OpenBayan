"use client"

import { IconGitBranch } from "@tabler/icons-react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Card as SwapCard } from "@/components/landing/CardSwap"
import { AnimatedSection, SectionLabel } from "./hero-shared"

const CardSwap = dynamic(() => import("@/components/landing/CardSwap"), {
  loading: () => <Skeleton className="h-[260px] w-[360px]" />,
  ssr: false,
})

export function ConnectionsSection() {
  return (
    <AnimatedSection id="connections" className="border-y bg-muted/25 py-16 md:py-24 [content-visibility:auto] [contain-intrinsic-size:1px_600px]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div className="rich-connection-stack relative min-h-[560px] overflow-hidden rounded-lg">
          <CardSwap
            width={340}
            height={240}
            cardDistance={24}
            verticalDistance={-32}
            delay={4500}
            onCardClick={() => undefined}
            skewAmount={3}
            easing="elastic"
          >
            <SwapCard className="p-5 shadow-2xl">
              <div className="text-xs font-medium uppercase text-muted-foreground">Layer 1</div>
              <h3 className="mt-3 text-xl font-semibold">Exact text match</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Character, word, and sentence similarity catch direct wording across source text.
              </p>
              <div className="mt-5 rounded-md bg-muted px-3 py-2 text-sm">قلب / qolb / heart</div>
            </SwapCard>
            <SwapCard className="p-5 shadow-2xl">
              <div className="text-xs font-medium uppercase text-muted-foreground">Layer 2</div>
              <h3 className="mt-3 text-xl font-semibold">Semantic embedding</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Meaning-aware vectors surface passages related by concept, not only same words.
              </p>
              <div className="mt-5 rounded-md bg-muted px-3 py-2 text-sm">heart, intention, insight</div>
            </SwapCard>
            <SwapCard className="p-5 shadow-2xl">
              <div className="text-xs font-medium uppercase text-muted-foreground">Layer 3</div>
              <h3 className="mt-3 text-xl font-semibold">Entities + graph</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Detected entities connect through strong graph edges, categories, and references.
              </p>
              <div className="mt-5 rounded-md bg-muted px-3 py-2 text-sm">Wikipedia + web context</div>
            </SwapCard>
            <SwapCard className="p-5 shadow-2xl">
              <div className="text-xs font-medium uppercase text-muted-foreground">Layer 4</div>
              <h3 className="mt-3 text-xl font-semibold">Arabic root relation</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Root words, popular variations, and related forms reveal broader Arabic links.
              </p>
              <div className="mt-5 rounded-md bg-muted px-3 py-2 text-sm">ق ل ب → قلوب، قلب، تقلب</div>
            </SwapCard>
          </CardSwap>
        </div>

        <div>
          <SectionLabel icon={IconGitBranch}>Rich connections + entity references</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
            Results connect through text, meaning, roots, entities, and references.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Search is multi-layered: exact character, word, and sentence similarity; semantic
            embeddings; entity detection; graph strength; Arabic roots; popular variations; and
            extra references such as Wikipedia or web search when useful.
          </p>
        </div>
      </div>
    </AnimatedSection>
  )
}
