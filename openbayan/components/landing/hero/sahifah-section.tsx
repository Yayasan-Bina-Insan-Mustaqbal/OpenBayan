"use client"

import { useState } from "react"
import { IconBookmark, IconFileText } from "@tabler/icons-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { AnimatedSection, SectionLabel } from "./hero-shared"

const alamatItems = ["Search query", "Sentence", "Ayat", "Hadith", "Category", "Entity"]

const sahifahBlocks = [
  "Narration",
  "Embedded ayat",
  "Hadith evidence",
  "Majmu' alamat",
  "Category path",
  "Reader exploration",
]

export function SahifahSection() {
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
