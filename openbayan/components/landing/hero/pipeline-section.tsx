"use client"

import { useEffect, useState } from "react"
import { IconBrain } from "@tabler/icons-react"
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnimatedSection, SectionLabel } from "./hero-shared"

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

export function PipelineSection() {
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
