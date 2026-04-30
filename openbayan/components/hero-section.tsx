"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  IconArrowRight,
  IconBook,
  IconBookmark,
  IconBrain,
  IconChevronRight,
  IconDatabaseSearch,
  IconFileText,
  IconGitBranch,
  IconLanguage,
  IconNotes,
  IconPresentation,
  IconSearch,
  IconWifiOff,
} from "@tabler/icons-react"
import { AnimatePresence, motion } from "motion/react"

import { LogoIcon } from "@/components/logo"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HeroBackground } from "@/components/hero-background"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Card as SwapCard } from "@/components/CardSwap"

const CardSwap = dynamic(() => import("@/components/CardSwap"), {
  loading: () => <Skeleton className="h-[260px] w-[360px]" />,
  ssr: false,
})

/* const Threads = dynamic(() => import("@/components/Threads"), {
  loading: () => <div className="h-full w-full bg-muted/10" />,
  ssr: false,
}) */

const TextType = dynamic(() => import("@/components/TextType"), {
  ssr: false,
})

const MermaidPipelineDiagram = dynamic(
  () => import("beautiful-mermaid").then((mod) => {
    const Component = ({ chart }: { chart: string }) => {
      const svg = mod.renderMermaidSVG(chart, {
        bg: "var(--card)",
        fg: "var(--card-foreground)",
        accent: "var(--primary)",
        line: "var(--primary)",
        muted: "var(--muted-foreground)",
        surface: "var(--background)",
        border: "var(--border)",
        transparent: true,
      })
      return (
        <div
          className="[&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg ?? "" }}
        />
      )
    }
    return Component
  }),
  {
    loading: () => <Skeleton className="h-[300px] w-full" />,
    ssr: false,
  }
)

const searchTypingSpeed = 95
const searchPauseDuration = 1800
const searchDeletingSpeed = 70

const typingSearchScenes = {
  arabic: {
    tags: [
      ["qolb", "transliteration"],
      ["heart", "English translation"],
      ["saliim", "nearest relation"],
    ],
    definition:
      "Qolb refers to the heart as an inner center of understanding, intention, turning, faith, and spiritual perception.",
    ayat: [
      {
        ref: "Al-Baqarah 2:10",
        text: "فِي قُلُوبِهِم مَّرَضٌ",
        note: "mentions a disease within hearts",
      },
      {
        ref: "Ash-Shu'ara 26:89",
        text: "إِلَّا مَنْ أَتَى اللَّهَ بِقَلْبٍ سَلِيمٍ",
        note: "connects qalb with saliim",
      },
    ],
  },
  latin: {
    tags: [
      ["قلب", "Arabic match"],
      ["qalb", "standard transliteration"],
      ["fu'ad", "related heart term"],
    ],
    definition:
      "A literal qolb search is treated as transliteration first, then expanded into Arabic spelling, related forms, and semantic neighbors.",
    ayat: [
      {
        ref: "Al-Hajj 22:46",
        text: "وَلَـٰكِن تَعْمَى الْقُلُوبُ الَّتِي فِي الصُّدُورِ",
        note: "mentions hearts in the chests",
      },
      {
        ref: "Qaf 50:37",
        text: "لِمَن كَانَ لَهُ قَلْبٌ",
        note: "connects qalb with reflection",
      },
    ],
  },
} as const

const pipelineDiagrams = [
  {
    value: "quran",
    label: "Quran",
    description: "Preserve ayah structure, then branch into roots, entities, and embeddings.",
    chart: `
flowchart LR
  source["Mushaf text"]
  enrich["Ayah enrich"]
  roots["Roots"]
  entity["Entities"]
  embed["Embeddings"]
  source --> enrich
  enrich --> roots
  enrich --> entity
  enrich --> embed
`,
  },
  {
    value: "hadith",
    label: "Hadith",
    description: "Detect narration units, then branch into topics, narrators, and related hadith.",
    chart: `
flowchart LR
  source["Hadith text"]
  enrich["Narration enrich"]
  topic["Topics"]
  narrator["Narrators"]
  relation["Related hadith"]
  source --> enrich
  enrich --> topic
  enrich --> narrator
  enrich --> relation
`,
  },
  {
    value: "tafsir",
    label: "Tafsir",
    description: "Link explanations to ayat, then branch into ayah links, language notes, and themes.",
    chart: `
flowchart LR
  source["Tafsir text"]
  enrich["Explanation enrich"]
  ayah["Linked ayah"]
  language["Language notes"]
  theme["Themes"]
  source --> enrich
  enrich --> ayah
  enrich --> language
  enrich --> theme
`,
  },
  {
    value: "fiqh",
    label: "Fiqh",
    description: "Map legal structure, then branch into evidence, school context, and entities.",
    chart: `
flowchart LR
  source["Fiqh book"]
  enrich["Ruling enrich"]
  evidence["Evidence"]
  school["School context"]
  entity["Entities"]
  source --> enrich
  enrich --> evidence
  enrich --> school
  enrich --> entity
`,
  },
  {
    value: "book",
    label: "Other Book",
    description: "Clean book text, then branch into headings, categories, and entities.",
    chart: `
flowchart LR
  source["Book text"]
  enrich["Passage enrich"]
  heading["Headings"]
  category["Categories"]
  entity["Entities"]
  source --> enrich
  enrich --> heading
  enrich --> category
  enrich --> entity
`,
  },
]

const alamatItems = ["Search query", "Sentence", "Ayat", "Hadith", "Category", "Entity"]

const sahifahBlocks = [
  "Narration",
  "Embedded ayat",
  "Hadith evidence",
  "Majmu' alamat",
  "Category path",
  "Reader exploration",
]

const futureFeatures = [
  {
    icon: IconPresentation,
    title: "Present From Sahifah",
    body: "Use Reveal.js and Chalkboard from selected sahifah text, narration notes, and PDF export.",
  },
  {
    icon: IconWifiOff,
    title: "Work Offline",
    body: "Write sahifah, manage alamat, prepare presentations, and download sources for local search.",
  },
]

function AnimatedSection({
  id,
  className,
  children,
}: {
  id?: string
  className?: string
  children: ReactNode
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: typeof IconSearch
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <Icon className="size-4" />
      {children}
    </div>
  )
}

function SearchSourceSection() {
  const [typingScene, setTypingScene] = useState<keyof typeof typingSearchScenes>("arabic")
  const scene = typingSearchScenes[typingScene]

  return (
    <AnimatedSection id="features" className="bg-background py-20 md:py-28 [content-visibility:auto] [contain-intrinsic-size:1px_720px]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
        <div className="lg:pt-12">
          <SectionLabel icon={IconLanguage}>Search your way + multi-source knowledge</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
            One search surface, many languages, many Islamic sources.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Search with Arabic, English, Indonesian, Russian, translation, or transliteration
            across Qur&apos;an, hadith, tafsir, aqidah, fiqh, and available books from ulama.
            AI-made translation or transliteration is marked when official text is missing.
          </p>
        </div>

        <div className="min-h-[720px] overflow-hidden rounded-lg border bg-card" id="search">
          <div className="border-b p-4">
            <div className="rounded-lg border bg-background p-3">
              <div className="flex min-h-11 items-center gap-2 rounded-md bg-muted px-3 py-2 text-base">
                <IconDatabaseSearch className="size-4 shrink-0 text-muted-foreground" />
                <TextType
                  text={["قلب", "qolb"]}
                  loop
                  className="font-medium"
                  typingSpeed={searchTypingSpeed}
                  pauseDuration={searchPauseDuration}
                  deletingSpeed={searchDeletingSpeed}
                  showCursor
                  cursorCharacter="_"
                  cursorBlinkDuration={0.5}
                  variableSpeed={undefined}
                  onSentenceComplete={(completedText: string) => {
                    setTypingScene(completedText === "قلب" ? "latin" : "arabic")
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <motion.div
              layout
              transition={{ layout: { duration: 0.45, ease: "easeInOut" } }}
              className="p-4 md:p-6"
            >
              <motion.div layout className="flex flex-wrap gap-2">
                {scene.tags.map(([label, description]) => (
                  <motion.span
                    layout
                    key={`${label}-${description}`}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{label}</span>
                    <span className="ms-2 text-muted-foreground">{description}</span>
                  </motion.span>
                ))}
              </motion.div>

              <motion.article
                layout
                transition={{ layout: { duration: 0.45, ease: "easeInOut" } }}
                className="mt-4 rounded-lg border bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-medium">Definition of qolb</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{scene.definition}</p>
              </motion.article>

              <motion.div layout className="mt-4 grid gap-3">
                {scene.ayat.map((ayah, index) => (
                  <motion.article
                    key={ayah.ref}
                    layout
                    transition={{ layout: { duration: 0.45, ease: "easeInOut", delay: index * 0.02 } }}
                    className="rounded-lg border bg-background p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-medium">{ayah.ref}</h4>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        ayat
                      </span>
                    </div>
                    <p dir="rtl" className="mt-3 text-xl leading-10">
                      {ayah.text}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{ayah.note}</p>
                  </motion.article>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  )
}

function ConnectionsSection() {
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

function PipelineSection() {
  const [activePipelineTab, setActivePipelineTab] = useState(pipelineDiagrams[0].value)
  const activePipeline = pipelineDiagrams.find((diagram) => diagram.value === activePipelineTab) ?? pipelineDiagrams[0]

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActivePipelineTab((current) => {
        const currentIndex = pipelineDiagrams.findIndex((diagram) => diagram.value === current)
        return pipelineDiagrams[(currentIndex + 1) % pipelineDiagrams.length].value
      })
    }, 4500)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <AnimatedSection id="pipeline" className="border-y bg-muted/25 py-16 md:py-24 [content-visibility:auto] [contain-intrinsic-size:1px_600px]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <Tabs value={activePipelineTab} onValueChange={setActivePipelineTab} className="w-full gap-5">
            <TabsList className="flex min-h-12 w-full flex-wrap items-stretch justify-start gap-1.5 p-1.5">
              {pipelineDiagrams.map((diagram) => (
                <TabsTrigger key={diagram.value} value={diagram.value} className="h-9 flex-none px-4">
                  {diagram.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activePipelineTab}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePipelineTab}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{activePipeline.label} pipeline</CardTitle>
                      <CardDescription>{activePipeline.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="min-h-[360px] text-sm text-muted-foreground">
                      <MermaidPipelineDiagram chart={activePipeline.chart} />
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <SectionLabel icon={IconBrain}>Custom processing pipeline</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
            Each source are prepared with a pipeline shaped for that text.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            A Qur&apos;an corpus, hadith collection, tafsir, fiqh book, or modern work may need
            different cleaning, segmentation, translation, entity extraction, and graph rules.
          </p>
        </div>
      </div>
    </AnimatedSection>
  )
}

function SahifahSection() {
  const [savedItems, setSavedItems] = useState(alamatItems.slice(0, 3))

  function toggleItem(item: string) {
    setSavedItems((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item]
    )
  }

  return (
    <AnimatedSection id="sahifah" className="border-y bg-muted/25 py-16 md:py-24 [content-visibility:auto] [contain-intrinsic-size:1px_600px]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div>
          <SectionLabel icon={IconBookmark}>Save notes + file-based documents</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
            Collect alamat into majmu&apos;, then write a sahifah from the evidence.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Save useful queries, sentences, ayat, hadith, categories, and entities as alamat.
            Collect them into majmu&apos;, add tadabbur notes, and embed them into a BlockNote
            sahifah with narration.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <IconBookmark className="size-4" />
              Alamat shelf
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {alamatItems.map((item) => (
                <motion.button
                  key={item}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => toggleItem(item)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm transition",
                    savedItems.includes(item)
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <IconFileText className="size-4" />
              Sahifah draft
            </div>
            <div className="mt-4 grid gap-2">
              {sahifahBlocks.map((block, index) => (
                <motion.div
                  key={block}
                  layout
                  className={cn(
                    "rounded-md border bg-background p-3 text-sm",
                    index === 3 && savedItems.length > 0 && "border-primary"
                  )}
                >
                  {block}
                  {index === 3 && (
                    <span className="ms-2 text-muted-foreground">({savedItems.length} saved)</span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  )
}

function FutureSection() {
  return (
    <AnimatedSection id="future" className="bg-background py-16 md:py-24 [content-visibility:auto] [contain-intrinsic-size:1px_400px]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <SectionLabel icon={IconNotes}>Future direction</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
            From research document to presentation and offline work.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {futureFeatures.map((feature, index) => {
            const Icon = feature.icon

            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-lg border bg-card p-6"
              >
                <Icon className="size-5 text-primary" />
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.body}</p>
              </motion.article>
            )
          })}
        </div>
      </div>
    </AnimatedSection>
  )
}

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

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/workspace">
                    <IconSearch data-icon="inline-start" />
                    Explore workspace
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#features">View features</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 }}
              className="relative mx-auto mt-14 max-w-7xl overflow-hidden rounded-lg border bg-card shadow-2xl shadow-muted"
            >
              <div className="flex items-center justify-between border-b bg-muted/35 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <LogoIcon className="size-4" />
                    <span className="text-xs font-medium text-muted-foreground">OpenBayan Workspace</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-6 w-64 rounded-md border bg-background/50 px-2 flex items-center gap-2">
                    <IconSearch className="size-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Search workspace...</span>
                  </div>
                </div>
              </div>

              <div className="flex min-h-[620px]">
                {/* Mock Sidebar */}
                <aside className="hidden w-64 border-e bg-muted/10 p-4 lg:block">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Explorer</div>
                  <div className="mt-4 flex flex-col gap-2 text-sm">
                    {[
                      { label: "sources", icon: IconDatabaseSearch },
                      { label: "sahifah", icon: IconFileText },
                      { label: "alamat", icon: IconBookmark },
                      { label: "graph", icon: IconGitBranch },
                    ].map((item, index) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.22 + index * 0.04 }}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <item.icon className="size-4" />
                        <span className="capitalize">{item.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </aside>

                <div className="flex flex-1 flex-col">
                  {/* Mock Dual Pane */}
                  <div className="flex flex-1 overflow-hidden">
                    <div className="flex flex-1 flex-col border-e">
                      <div className="flex h-10 items-end border-b bg-muted/20 px-2">
                        <div className="flex h-9 items-center gap-2 rounded-t-md border border-b-0 bg-background px-3 text-xs">
                          <IconFileText className="size-3.5 text-primary" />
                          <span>qolb-research.sahifah</span>
                        </div>
                        <div className="flex h-9 items-center gap-2 px-3 text-xs text-muted-foreground">
                          <IconDatabaseSearch className="size-3.5" />
                          <span>Al-Baqarah 2:10</span>
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto p-6">
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.24 }}
                          className="mx-auto max-w-2xl"
                        >
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 mb-6">
                            <IconBook size={12} />
                            documents/qolb-research.sahifah
                          </div>
                          <div className="flex flex-col gap-4 font-mono text-sm leading-7 text-muted-foreground">
                            <p>{"# Understanding Heart (Qolb)"}</p>
                            <p>{"Qolb refers to the heart as an inner center of understanding, intention, turning, and faith."}</p>
                            <div className="rounded-md border bg-muted/30 p-4 font-sans text-foreground">
                              <p dir="rtl" className="text-right text-lg leading-loose">فِي قُلُوبِهِم مَّرَضٌ</p>
                              <p className="mt-2 text-xs text-muted-foreground">Al-Baqarah 2:10 - "In their hearts is a disease..."</p>
                            </div>
                            <p>{"The connection between qolb and reflection is central to Islamic epistemology."}</p>
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    <aside className="hidden w-80 flex-col bg-muted/5 lg:flex">
                      <div className="flex h-10 items-end border-b bg-muted/20 px-2">
                        <div className="flex h-9 items-center gap-2 rounded-t-md border border-b-0 bg-background px-3 text-xs">
                          <IconGitBranch className="size-3.5 text-primary" />
                          <span>Connections</span>
                        </div>
                      </div>
                      <div className="flex-1 p-4">
                        <div className="grid gap-3">
                          {[
                            { label: "Semantic", value: "0.92 correlation" },
                            { label: "Entity", value: "Qolb (Heart)" },
                            { label: "Root", value: "q-l-b (ق ل ب)" },
                          ].map((item, index) => (
                            <motion.div
                              key={item.label}
                              initial={{ opacity: 0, x: 12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.34 + index * 0.06 }}
                              className="rounded-md border bg-background p-3"
                            >
                              <div className="text-[10px] font-medium uppercase text-muted-foreground">{item.label}</div>
                              <div className="mt-1 text-xs font-semibold">{item.value}</div>
                            </motion.div>
                          ))}
                        </div>
                        
                        <div className="mt-6 rounded-lg border bg-background p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <IconBookmark className="size-3.5 text-primary" />
                            Saved Alamat
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className="rounded bg-muted px-2 py-1 text-[10px]">Al-Hajj 22:46</span>
                            <span className="rounded bg-muted px-2 py-1 text-[10px]">Qaf 50:37</span>
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <SearchSourceSection />
        {/* <ConnectionsSection /> */}
        <PipelineSection />
        {/* <SahifahSection /> */}
        <FutureSection />
      </main>
    </>
  )
}
