"use client"

import React, { Children, forwardRef, isValidElement, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence, Transition } from "motion/react"
import "./CardSwap.css"

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { customClass?: string }>(
  ({ customClass, ...rest }, ref) => (
    <div ref={ref} {...rest} className={`card-swap-card ${customClass ?? ""} ${rest.className ?? ""}`.trim()} />
  )
)
Card.displayName = "Card"

const makeSlot = (i: number, distX: number, distY: number, total: number) => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i,
})

interface CardSwapProps {
  width?: number | string
  height?: number | string
  cardDistance?: number
  verticalDistance?: number
  delay?: number
  pauseOnHover?: boolean
  onCardClick?: (idx: number) => void
  skewAmount?: number
  easing?: "linear" | "elastic"
  children: React.ReactNode
}

const CardSwap: React.FC<CardSwapProps> = ({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  onCardClick,
  skewAmount = 6,
  easing = "elastic",
  children,
}) => {
  const childArr = useMemo(() => Children.toArray(children), [children])
  const [order, setOrder] = useState(() => Array.from({ length: childArr.length }, (_, i) => i))
  const [isPaused, setIsPaused] = useState(false)

  const transition = useMemo<Transition>(() => {
    if (easing === "elastic") {
      return {
        type: "spring",
        stiffness: 100,
        damping: 15,
        mass: 1,
      }
    }
    return {
      type: "tween",
      ease: "easeInOut",
      duration: 0.8,
    }
  }, [easing])

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setOrder((prev) => {
        const [front, ...rest] = prev
        return [...rest, front]
      })
    }, delay)

    return () => clearInterval(interval)
  }, [delay, isPaused])

  const rendered = order.map((idx, i) => {
    const child = childArr[idx]
    if (!isValidElement(child)) return null

    const slot = makeSlot(i, cardDistance, verticalDistance, childArr.length)

    return (
      <motion.div
        key={idx}
        layoutId={`card-${idx}`}
        style={{
          width,
          height,
          position: "absolute",
          top: "50%",
          left: "50%",
        }}
        initial={false}
        animate={{
          x: `calc(-50% + ${slot.x}px)`,
          y: `calc(-50% + ${slot.y}px)`,
          z: slot.z,
          zIndex: slot.zIndex,
          skewY: skewAmount,
        }}
        transition={transition}
        onMouseEnter={() => pauseOnHover && setIsPaused(true)}
        onMouseLeave={() => pauseOnHover && setIsPaused(false)}
        onClick={() => onCardClick?.(idx)}
      >
        {child}
      </motion.div>
    )
  })

  return (
    <div className="card-swap-container" style={{ width, height, perspective: 1000 }}>
      <AnimatePresence>
        {rendered}
      </AnimatePresence>
    </div>
  )
}

export default CardSwap
