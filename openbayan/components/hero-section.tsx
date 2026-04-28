"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  IconArrowRight,
  IconBookmark,
  IconBrain,
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
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Card as SwapCard } from "@/components/CardSwap"

const CardSwap = dynamic(() => import("@/components/CardSwap"), {
  loading: () => <Skeleton className="h-[260px] w-[360px]" />,
  ssr: false,
})

const Threads = dynamic(() => import("@/components/Threads"), {
  loading: () => <div className="h-full w-full bg-muted/10" />,
  ssr: false,
})

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
            width={360}
            height={260}
            cardDistance={52}
            verticalDistance={58}
            delay={4200}
            onCardClick={() => undefined}
            skewAmount={0}
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
    <AnimatedSection id="pipeline" className="bg-background py-16 md:py-24 [content-visibility:auto] [contain-intrinsic-size:1px_600px]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
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
            className="absolute inset-x-0 -top-40 h-[900px] opacity-35"
          >
            <Threads
              color={[0.32, 0.15, 1]}
              amplitude={1.6}
              distance={0}
              enableMouseInteraction
            />
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
                  <Link href="/dashboard">
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
              <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-muted/35 px-4 py-3">
                <div className="flex items-center gap-2">
                  <LogoIcon />
                  <span className="text-sm font-medium">OpenBayan Workspace</span>
                </div>
                <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
                  <span>Search</span>
                  <span className="h-4 w-px bg-border" />
                  <span>Graph</span>
                  <span className="h-4 w-px bg-border" />
                  <span>Alamat</span>
                  <span className="h-4 w-px bg-border" />
                  <span>Sahifah</span>
                </div>
              </div>

              <div className="grid min-h-[590px] lg:grid-cols-[220px_1fr_300px]">
                <aside className="hidden border-e bg-muted/20 p-4 lg:block">
                  <div className="text-xs font-medium uppercase text-muted-foreground">Sources</div>
                  <div className="mt-4 flex flex-col gap-2 text-sm">
                    {["Qur'an", "Hadith", "Tafsir", "Aqidah", "Fiqh", "Books"].map((source, index) => (
                      <motion.div
                        key={source}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.22 + index * 0.04 }}
                        className={cn(
                          "flex items-center justify-between rounded-md border px-3 py-2",
                          index === 0 ? "bg-primary text-primary-foreground" : "bg-background"
                        )}
                      >
                        <span>{source}</span>
                        <span className={cn("text-xs", index === 0 ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          on
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-7 text-xs font-medium uppercase text-muted-foreground">Input modes</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Arabic", "ID", "EN", "RU", "Translit"].map((mode) => (
                      <span key={mode} className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
                        {mode}
                      </span>
                    ))}
                  </div>
                </aside>

                <div className="p-4 md:p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24 }}
                    className="rounded-lg border bg-background p-3"
                  >
                    <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <IconDatabaseSearch className="size-4" />
                      mercy in social obligation / رحمة في المعاملة
                    </div>
                  </motion.div>

                  <div className="mt-5 grid gap-3">
                    {[
                      {
                        title: "Qur'an result",
                        tag: "source",
                        body: "Ayat, official translation when available, AI warning when generated, related roots, and nearby semantic matches.",
                        arabic: "وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ",
                      },
                      {
                        title: "Hadith and fiqh connection",
                        tag: "graph",
                        body: "Related narrations, legal categories, entities, and strong graph edges remain visible beside the source text.",
                        arabic: "الراحمون يرحمهم الرحمن",
                      },
                      {
                        title: "Alamat capture",
                        tag: "note",
                        body: "Save the query, passage, root, entity, or category into majmu' before writing a sahifah.",
                        arabic: "حفظ الدليل ثم تحرير الفهم",
                      },
                    ].map((item, index) => (
                      <motion.article
                        key={item.title}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -3 }}
                        transition={{ delay: 0.3 + index * 0.08 }}
                        className="rounded-lg border bg-card p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h2 className="text-sm font-medium">{item.title}</h2>
                          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {item.tag}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
                        <p dir="rtl" className="mt-4 text-lg leading-9">
                          {item.arabic}
                        </p>
                      </motion.article>
                    ))}
                  </div>
                </div>

                <aside className="border-t bg-muted/20 p-4 lg:border-s lg:border-t-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <IconGitBranch className="size-4" />
                    Connection panel
                  </div>

                  <div className="mt-4 grid gap-2 text-sm">
                    {[
                      ["Semantic", "0.92"],
                      ["Entity", "rahmah"],
                      ["Root", "ر ح م"],
                      ["Reference", "Wikipedia + web"],
                    ].map(([label, value], index) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.34 + index * 0.06 }}
                        className="rounded-md border bg-background p-3"
                      >
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className="mt-1 font-medium">{value}</div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-lg border bg-background p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <IconFileText className="size-4" />
                      Sahifah draft
                    </div>
                    <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                      <div className="rounded-md bg-muted px-3 py-2">Narration block</div>
                      <div className="rounded-md bg-muted px-3 py-2">Embedded ayat</div>
                      <div className="rounded-md bg-muted px-3 py-2">Majmu&apos; alamat</div>
                    </div>
                  </div>
                </aside>
              </div>
            </motion.div>
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
