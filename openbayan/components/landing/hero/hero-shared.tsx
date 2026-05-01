"use client"

import { type ReactNode } from "react"
import { motion } from "motion/react"
import { type IconSearch } from "@tabler/icons-react"

export function AnimatedSection({
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

export function SectionLabel({
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
