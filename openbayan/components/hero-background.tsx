"use client"

import { motion } from "motion/react"
import { useEffect, useState } from "react"

export function HeroBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Soft gradient orb 1 */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.8, 1, 0.8],
          x: [0, 225, -120, 0],
          y: [0, -150, 75, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-[20%] left-[5%] h-[700px] w-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, color-mix(in oklab, var(--primary) 40%, transparent) 0%, transparent 70%)'
        }}
      />
      
      {/* Soft gradient orb 2 */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.7, 1, 0.7],
          x: [0, -180, 135, 0],
          y: [0, 150, -90, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[10%] right-[5%] h-[600px] w-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, color-mix(in oklab, var(--chart-2) 50%, transparent) 0%, transparent 70%)'
        }}
      />

      {/* Subtle geometric grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30L30 0z' fill-rule='evenodd' stroke='%23888888' stroke-width='1' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Fade out bottom edge to blend with page content */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  )
}
