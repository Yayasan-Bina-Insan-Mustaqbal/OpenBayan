"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import { IconBook, IconDatabase, IconNetwork, IconSearch } from "@tabler/icons-react"

const docLinks = [
  { name: "Quran Ingestion", href: "/docs/quran_ingestion", icon: IconDatabase },
  { name: "Hadith Ingestion", href: "/docs/hadith_ingestion", icon: IconDatabase },
  { name: "Books Ingestion", href: "/docs/books_ingestion", icon: IconBook },
  { name: "Sentences Ingestion", href: "/docs/sentences_ingestion", icon: IconNetwork },
  { name: "MURAD Dictionary", href: "/docs/dictionary_murad_ingestion", icon: IconBook },
  { name: "Search Architecture", href: "/docs/search", icon: IconSearch },
]

export function DocsNav() {
  const pathname = usePathname()
  
  // Filter out the current page
  const filteredLinks = docLinks.filter(link => link.href !== pathname)

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 border-t">
      <h3 className="text-xl font-semibold mb-6">Explore Other Documentation</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {filteredLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href}>
              <motion.div
                whileHover={{ y: -2 }}
                className="flex items-center gap-3 rounded-xl border p-4 bg-card/50 hover:bg-card hover:border-emerald-500/30 transition-all cursor-pointer h-full"
              >
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500 shrink-0">
                  <Icon className="size-4" />
                </div>
                <span className="text-sm font-medium text-foreground leading-snug">{link.name}</span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
