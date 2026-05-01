"use client"

import { useState } from "react"
import { IconDatabaseSearch, IconLanguage } from "@tabler/icons-react"
import { motion } from "motion/react"
import dynamic from "next/dynamic"
import { AnimatedSection, SectionLabel } from "./hero-shared"

const TextType = dynamic(() => import("@/components/landing/TextType"), {
  ssr: false,
})

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

export function SearchSourceSection() {
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
