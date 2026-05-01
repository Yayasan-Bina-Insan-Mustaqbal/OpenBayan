"use client"

import { motion } from "motion/react"
import { IconBook, IconBookmark, IconLanguage, IconHash } from "@tabler/icons-react"
import type { SentenceResult } from "@/lib/types/search"

export function SearchResultCard({ result, index }: { result: SentenceResult; index: number }) {
  const arabic = result.content.find((c) => c.type === "arabic")?.text
  const translation = result.content.find((c) => c.type === "translation")?.text

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group rounded-xl border bg-card shadow-sm transition-all hover:shadow-md overflow-hidden cursor-pointer"
    >
      <div className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 overflow-hidden">
            {result.resource_type === "quran" ? (
              <IconBook className="size-4 text-primary shrink-0" />
            ) : (
              <IconBookmark className="size-4 text-primary shrink-0" />
            )}
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-semibold">{result.citation.source_book}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-muted-foreground truncate">
                {result.bab || result.citation.chapter}
              </span>
              {result.subchapter && (
                <>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-muted-foreground truncate">{result.subchapter}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {result.resource_type}
            </span>
            <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600 uppercase tracking-wider">
              {result.citation.authenticity_grade}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {arabic && (
            <div className="relative">
              <p
                dir="rtl"
                className="text-3xl leading-relaxed text-right font-arabic text-foreground/90"
              >
                {arabic}
              </p>
            </div>
          )}

          {translation && (
            <div className="flex gap-4">
              <div className="mt-1.5 text-muted-foreground/30 shrink-0">
                <IconLanguage className="size-4" />
              </div>
              <p className="text-base text-foreground/80 leading-relaxed italic">{translation}</p>
            </div>
          )}
        </div>

        {/* Categories / Tags */}
        <div className="mt-6 flex flex-wrap gap-2">
          {result.category_path.map((cat, i) => (
            <span
              key={i}
              className="text-[10px] font-medium text-muted-foreground/70 bg-muted/40 px-2 py-1 rounded-md border border-transparent hover:border-muted-foreground/20 transition-all"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Footer / Meta */}
      <div className="px-5 py-3 bg-muted/20 border-t flex items-center justify-between text-[10px] text-muted-foreground/70">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            <span>Match: {(result.relevance_score * 100).toFixed(0)}%</span>
          </div>
          {result.mentioned_entities.length > 0 && (
            <div className="flex items-center gap-1">
              <IconHash className="size-2.5" />
              <span>{result.mentioned_entities.map((e) => e.canonical_name).join(", ")}</span>
            </div>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 font-medium text-primary">
          Deep Dive ➔
        </div>
      </div>
    </motion.div>
  )
}
