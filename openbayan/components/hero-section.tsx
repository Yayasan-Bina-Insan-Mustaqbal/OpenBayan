"use client"

import Link from "next/link"
import {
  IconArrowRight,
  IconBook2,
  IconBrain,
  IconCategory2,
  IconDatabaseSearch,
  IconFileText,
  IconGitBranch,
  IconLanguage,
  IconNotebook,
  IconRoute,
  IconSearch,
  IconShieldCheck,
  IconSparkles,
  IconTags,
} from "@tabler/icons-react"

import { LogoIcon } from "@/components/logo"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"

const metrics = [
  { label: "Search target", value: "<60ms" },
  { label: "Research modes", value: "3" },
  { label: "Deep lenses", value: "5" },
]

const features = [
  {
    icon: IconDatabaseSearch,
    title: "Hybrid retrieval",
    body: "Combines semantic vectors, exact words, roots, tags, and source filters for focused scholarly search.",
  },
  {
    icon: IconCategory2,
    title: "Knowledge Tree",
    body: "Clusters results by Quran, Hadith, Tafsir, Fiqh, entities, and roots instead of showing a flat feed.",
  },
  {
    icon: IconBrain,
    title: "AI enrichment",
    body: "Prefect and Ollama clean, segment, classify, translate, and vectorize texts before scholar review.",
  },
]

const researchModes = [
  {
    icon: IconSearch,
    title: "Advanced search",
    body: "Search Quran, Hadith, lexicon roots, entities, translations, and notes through exact terms and semantic meaning.",
    label: "Live Search",
  },
  {
    icon: IconGitBranch,
    title: "Knowledge graph",
    body: "Follow relationships between Fawaid, Sahifah source texts, Alamah tags, Majmu collections, roots, and entities.",
    label: "Graph Native",
  },
  {
    icon: IconNotebook,
    title: "Research notebooks",
    body: "Keep findings in structured notebooks with saved workspace state, citations, live embeds, and presentation-ready notes.",
    label: "Scholar IDE",
  },
]

const pipelineStages = [
  "Clean Arabic text",
  "Strip harakat",
  "Segment sentences",
  "Classify taxonomy",
  "Extract roots",
  "Generate embeddings",
  "Persist graph edges",
]

const taxonomyGroups = [
  "Ulum al-Quran",
  "Hadith sciences",
  "Fiqh and Usul",
  "Aqidah",
  "Seerah and Tarikh",
  "Arabic language",
]

const workspacePanels = [
  {
    title: "Search pipeline",
    body: "Preserves the legacy response model: category clusters, sentence results, entity matches, root-word results, and processing time.",
  },
  {
    title: "Arabic-first analysis",
    body: "Normalizes Alef variants, strips diacritics, keeps RTL reading flow, and recognizes root queries such as #root:كتب.",
  },
  {
    title: "Omni-storage direction",
    body: "The architecture keeps storage behind a service layer so web, cloud, and future desktop modes can share the same workspace model.",
  },
]

export default function HeroSection() {
  return (
    <>
      <SiteHeader />

      <main className="overflow-hidden">
        <section className="relative">
          <div className="mx-auto max-w-7xl px-6 pb-16 pt-24 md:pb-24">
            <div className="mx-auto max-w-3xl text-center">
              <Link
                href="#pipeline"
                className="mx-auto flex w-fit items-center gap-2 rounded-lg border p-1 pe-3"
              >
                <span className="rounded-md bg-muted px-2 py-1 text-xs">Early research build</span>
                <span className="text-sm text-muted-foreground">AI pipeline for Islamic texts</span>
                <span className="block h-4 w-px bg-border" />
                <IconArrowRight className="size-4" />
              </Link>

              <h1 className="mt-8 text-balance text-4xl font-semibold md:text-5xl xl:text-6xl xl:[line-height:1.125]">
                OpenBayan turns classical Islamic texts into searchable knowledge.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
                A scholar workspace for ingestion, semantic mapping, clustered search, Arabic
                roots, Indonesian translation, and human review over enriched Quran, Hadith,
                Tafsir, and Fiqh corpora.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/dashboard">
                    <IconSparkles data-icon="inline-start" />
                    Explore workspace
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#features">View features</Link>
                </Button>
              </div>
            </div>

            <div className="relative mx-auto mt-16 max-w-6xl overflow-hidden rounded-lg border bg-card shadow-2xl shadow-muted">
              <div className="flex items-center justify-between gap-4 border-b bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <LogoIcon />
                  <span className="text-sm font-medium">Scholar IDE</span>
                </div>
                <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                  <span>AI Semantic</span>
                  <span className="h-4 w-px bg-border" />
                  <span>Exact Word</span>
                  <span className="h-4 w-px bg-border" />
                  <span>Root Explorer</span>
                </div>
              </div>

              <div className="grid min-h-[460px] lg:grid-cols-[230px_1fr_290px]">
                <aside className="hidden border-e bg-muted/20 p-4 lg:block">
                  <div className="text-xs font-medium uppercase text-muted-foreground">Sources</div>
                  <div className="mt-4 flex flex-col gap-2 text-sm">
                    {["Al-Quran", "Hadith", "Tafsir", "Fiqh", "Lexicon"].map((source) => (
                      <div key={source} className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                        <span>{source}</span>
                        <span className="text-muted-foreground">on</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-xs font-medium uppercase text-muted-foreground">Journey</div>
                  <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                    <span>Search: zakat</span>
                    <span>Root: ز ك و</span>
                    <span>Tag: worship</span>
                  </div>
                </aside>

                <div className="p-4 md:p-6" id="search-preview">
                  <div className="rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <IconDatabaseSearch className="size-4" />
                      Search Quran, Hadith, Tafsir, roots, entities...
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
                    {[
                      {
                        title: "Quran: Surah Al-Baqarah",
                        tag: "Verified",
                        text: "Semantic window finds the exact 8-word fragment that answers the query.",
                      },
                      {
                        title: "Fiqh: Zakat categories",
                        tag: "Cluster",
                        text: "Results group by source, category, entity, and related root forms.",
                      },
                      {
                        title: "Lexicon: ز ك و",
                        tag: "Root",
                        text: "Every Arabic word can open morphology, grammar, and corpus distribution.",
                      },
                    ].map((item) => (
                      <article key={item.title} className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h2 className="text-sm font-medium">{item.title}</h2>
                          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{item.tag}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p>
                        <p dir="rtl" className="mt-4 text-lg leading-9">
                          يفتح البحث الدلالي طريقا منظما لفهم النصوص
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className="border-t bg-muted/20 p-4 lg:border-s lg:border-t-0" id="workspace-preview">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <IconBook2 className="size-4" />
                    Intelligence Panel
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs lg:grid-cols-1">
                    {["التدبر", "العمل", "توجيه", "معاني", "التفاسير"].map((tab) => (
                      <div key={tab} className="rounded-md border bg-background px-3 py-2">
                        {tab}
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-sm leading-6 text-muted-foreground">
                    Open any sentence into contemplations, habits, directives, lexicon analysis,
                    and exegesis while preserving tabs and scroll state.
                  </p>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/25 py-12" id="pipeline">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <div className="text-3xl font-semibold">{metric.value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{metric.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-background py-16 md:py-24" id="features">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IconRoute className="size-4" />
                Deep research tools for classical sources
              </div>
              <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
                Built around ingestion, enrichment, retrieval, and modern research workflows.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                OpenBayan ports classical scholarship into a modern architecture, combining 
                semantic search, knowledge graphs, and structured notebooks for deep analysis.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...features, ...researchModes].map((feature) => {
                const Icon = feature.icon

                return (
                  <article key={feature.title} className="flex flex-col rounded-lg border bg-card p-6">
                    <div className="flex items-center justify-between gap-4">
                      <Icon className="size-5 text-primary" />
                      {"label" in feature && (
                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {(feature as any).label}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 font-semibold">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.body}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bg-background py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IconBrain className="size-4" />
                AI factory
              </div>
              <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
                Ingestion turns raw Islamic texts into reviewed graph data.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Prefect flows coordinate Arabic preprocessing, classification, embedding
                generation, and SurrealDB writes so every source can become searchable Fawaid
                with traceable relationships.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {pipelineStages.map((stage, index) => (
                  <div key={stage} className="flex items-center gap-3 rounded-md bg-muted/40 p-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/25 py-16 md:py-24" id="taxonomy">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <IconTags className="size-4" />
                  Scholarly taxonomy
                </div>
                <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
                  Results are organized by Islamic disciplines, not just ranked lists.
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  The old taxonomy reference is reused as the vocabulary for Alamah tags,
                  giving the workspace paths through Quranic sciences, Hadith, Fiqh, Aqidah,
                  Seerah, ethics, and Arabic language.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {taxonomyGroups.map((group) => (
                  <div key={group} className="rounded-lg border bg-card p-4">
                    <p className="text-sm font-medium">{group}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Seeded into searchable tags and graph relations.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
