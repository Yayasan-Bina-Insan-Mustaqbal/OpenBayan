"use client"

import { IconNotes, IconPresentation, IconWifiOff } from "@tabler/icons-react"
import { motion } from "motion/react"
import { AnimatedSection, SectionLabel } from "./hero-shared"

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

export function FutureSection() {
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
