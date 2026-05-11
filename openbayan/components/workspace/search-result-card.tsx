"use client"

import { motion } from "motion/react"
import { IconBook } from "@tabler/icons-react"

export function SearchResultCard({ 
  result, 
  index,
  onClick
}: { 
  result: any; 
  index: number;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="group rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/40 overflow-hidden cursor-pointer"
    >
      <div className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <IconBook className="size-4 text-primary shrink-0" />
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-semibold text-foreground/80 truncate">
                {result.source_title || "Unknown Source"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <p
              dir="rtl"
              className="text-2xl leading-relaxed text-right font-arabic text-foreground/90"
            >
              {result.text}
            </p>
          </div>
        </div>
      </div>

      {/* Footer / Meta */}
      <div className="px-5 py-3 bg-muted/20 border-t flex items-center justify-between text-[10px] text-muted-foreground/70">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            <span>Score: {Number(result.score).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1 font-mono opacity-50">
            <span>{result.id}</span>
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 font-medium text-primary">
          Explore Graph ➔
        </div>
      </div>
    </motion.div>
  )
}
